package cm.majorants.controller;

import cm.majorants.model.SchoolUser;
import cm.majorants.repository.SchoolUserRepository;
import cm.majorants.repository.StudentRepository;
import jakarta.validation.Valid;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.Size;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.web.bind.annotation.*;
import org.springframework.web.server.ResponseStatusException;
import org.springframework.http.HttpStatus;

import java.util.List;
import java.util.Map;

@RestController
@RequestMapping("/api/users")
@PreAuthorize("hasAnyRole('PROMOTEUR','DIRECTEUR')")
public class UsersController {
    private static final List<String> ROLES = List.of("PROMOTEUR", "DIRECTEUR", "SECRETAIRE", "ENSEIGNANT", "PARENT", "ELEVE");
    private final SchoolUserRepository users;
    private final StudentRepository students;
    private final PasswordEncoder encoder;

    public UsersController(SchoolUserRepository users, StudentRepository students, PasswordEncoder encoder) {
        this.users = users;
        this.students = students;
        this.encoder = encoder;
    }

    @GetMapping
    public List<Map<String, String>> listUsers() {
        return users.findAll().stream()
                .map(user -> Map.of("username", user.getUsername(), "role", user.getRole(),
                        "schoolClass", user.getSchoolClass() == null ? "" : user.getSchoolClass(),
                        "studentId", user.getStudentId() == null ? "" : user.getStudentId()))
                .toList();
    }

    @PostMapping
    public Map<String, String> createUser(@Valid @RequestBody NewUser request) {
        if (users.existsById(request.username())) {
            throw new ResponseStatusException(HttpStatus.CONFLICT, "Ce nom d'utilisateur existe déjà");
        }
        if (!ROLES.contains(request.role())) {
            throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "Rôle invalide");
        }
        if ("ENSEIGNANT".equals(request.role())
                && (request.schoolClass() == null || request.schoolClass().isBlank())) {
            throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "La classe de l'enseignant est obligatoire");
        }
        if (("PARENT".equals(request.role()) || "ELEVE".equals(request.role()))
                && (request.studentId() == null || !students.existsById(request.studentId()))) {
            throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "Un compte parent/élève doit être lié à un élève existant");
        }
        SchoolUser user = new SchoolUser();
        user.setUsername(request.username());
        user.setPasswordHash(encoder.encode(request.password()));
        user.setRole(request.role());
        user.setStudentId(request.studentId());
        user.setSchoolClass(request.schoolClass());
        users.save(user);
        return Map.of("username", user.getUsername(), "role", user.getRole());
    }

    public record NewUser(@NotBlank String username, @NotBlank @Size(min = 10) String password, @NotBlank String role,
                          String studentId, String schoolClass) {
    }
}
