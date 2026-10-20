package cm.majorants.controller;

import cm.majorants.model.Attendance;
import cm.majorants.model.Payment;
import cm.majorants.model.SchoolUser;
import cm.majorants.model.Student;
import cm.majorants.repository.AttendanceRepository;
import cm.majorants.repository.PaymentRepository;
import cm.majorants.repository.SchoolUserRepository;
import cm.majorants.repository.StudentRepository;
import jakarta.validation.Valid;
import org.springframework.http.HttpStatus;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.security.core.Authentication;
import org.springframework.web.bind.annotation.*;
import org.springframework.web.server.ResponseStatusException;

import java.time.LocalDate;
import java.util.List;
import java.util.Map;

@RestController
@RequestMapping("/api")
public class RecordsController {
    private final StudentRepository students;
    private final AttendanceRepository attendance;
    private final PaymentRepository payments;
    private final SchoolUserRepository users;

    public RecordsController(StudentRepository students, AttendanceRepository attendance,
                             PaymentRepository payments, SchoolUserRepository users) {
        this.students = students;
        this.attendance = attendance;
        this.payments = payments;
        this.users = users;
    }

    @GetMapping("/students")
    public List<Student> getStudents(Authentication auth) {
        SchoolUser user = user(auth);
        if (isFamily(user)) return students.findById(user.getStudentId()).stream().toList();
        if ("ENSEIGNANT".equals(user.getRole())) {
            return students.findAll().stream().filter(s -> s.getSchoolClass().equals(user.getSchoolClass())).toList();
        }
        return students.findAll();
    }

    @PostMapping("/students")
    @PreAuthorize("hasAnyRole('PROMOTEUR','DIRECTEUR','SECRETAIRE')")
    public Student saveStudent(@Valid @RequestBody Student student) {
        return students.save(student);
    }

    @GetMapping("/attendance")
    public List<Attendance> getAttendance(Authentication auth) {
        SchoolUser user = user(auth);
        return scoped(attendance.findAll(), user, Attendance::getStudentId);
    }

    @PostMapping("/attendance")
    @PreAuthorize("hasAnyRole('PROMOTEUR','DIRECTEUR','SECRETAIRE','ENSEIGNANT')")
    public Attendance saveAttendance(@Valid @RequestBody Attendance record, Authentication auth) {
        SchoolUser user = user(auth);
        ensureClassScope(user, record.getStudentId());
        return attendance.save(record);
    }

    @GetMapping("/payments")
    @PreAuthorize("hasAnyRole('PROMOTEUR','DIRECTEUR','SECRETAIRE','PARENT','ELEVE')")
    public List<Payment> getPayments(Authentication auth) {
        SchoolUser user = user(auth);
        return scoped(payments.findAll(), user, Payment::getStudentId);
    }

    @PostMapping("/payments")
    @PreAuthorize("hasAnyRole('PROMOTEUR','DIRECTEUR','SECRETAIRE')")
    public Payment savePayment(@Valid @RequestBody Payment payment, Authentication auth) {
        ensureStudentScope(user(auth), payment.getStudentId());
        return payments.save(payment);
    }

    @GetMapping("/dashboard")
    public Map<String, Long> dashboard(Authentication auth) {
        SchoolUser user = user(auth);
        List<Student> visible = getStudents(auth);
        long presentToday = scoped(attendance.findAll(), user, Attendance::getStudentId).stream()
                .filter(a -> LocalDate.now().equals(a.getDate()) && !"ABSENT".equals(a.getStatus())).count();
        long unpaid = scoped(payments.findAll(), user, Payment::getStudentId).stream()
                .filter(p -> "EN_ATTENTE".equals(p.getStatus())).count();
        return Map.of("students", (long) visible.size(), "presentToday", presentToday, "unpaid", unpaid);
    }

    @GetMapping("/classes")
    public List<String> getClasses(Authentication auth) {
        return getStudents(auth).stream().map(Student::getSchoolClass).distinct().sorted().toList();
    }

    private SchoolUser user(Authentication auth) {
        return users.findById(auth.getName()).orElseThrow();
    }

    private boolean isFamily(SchoolUser user) {
        return "PARENT".equals(user.getRole()) || "ELEVE".equals(user.getRole());
    }

    private <T> List<T> scoped(List<T> records, SchoolUser user, java.util.function.Function<T, String> studentId) {
        if (isFamily(user)) {
            if (user.getStudentId() == null) return List.of();
            return records.stream().filter(item -> user.getStudentId().equals(studentId.apply(item))).toList();
        }
        if ("ENSEIGNANT".equals(user.getRole())) {
            return records.stream().filter(item -> students.findById(studentId.apply(item))
                    .map(student -> student.getSchoolClass().equals(user.getSchoolClass())).orElse(false)).toList();
        }
        return records;
    }

    private void ensureClassScope(SchoolUser user, String studentId) {
        if ("ENSEIGNANT".equals(user.getRole())) {
            ensureStudentScope(user, studentId);
        }
    }

    private void ensureStudentScope(SchoolUser user, String studentId) {
        Student student = students.findById(studentId)
                .orElseThrow(() -> new ResponseStatusException(HttpStatus.NOT_FOUND, "Élève introuvable"));
        if (isFamily(user) && !studentId.equals(user.getStudentId())) {
            throw new ResponseStatusException(HttpStatus.FORBIDDEN, "Accès interdit à cet élève");
        }
        if ("ENSEIGNANT".equals(user.getRole()) && !student.getSchoolClass().equals(user.getSchoolClass())) {
            throw new ResponseStatusException(HttpStatus.FORBIDDEN, "Élève hors de votre classe");
        }
    }
}
