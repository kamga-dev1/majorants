package cm.majorants.model;

import jakarta.persistence.Entity;
import jakarta.persistence.Id;
import jakarta.persistence.Table;
import jakarta.validation.constraints.NotBlank;
import lombok.Data;
import lombok.NoArgsConstructor;

import java.time.LocalDate;
import java.time.LocalTime;
import java.util.UUID;

@Entity
@Table(name = "majorants_attendance")
@Data
@NoArgsConstructor
public class Attendance {
    @Id
    private String id = UUID.randomUUID().toString();
    @NotBlank
    private String studentId;
    @NotBlank
    private String studentName;
    private LocalDate date = LocalDate.now();
    private LocalTime arrivalTime;
    private LocalTime departureTime;
    @NotBlank
    private String status = "PRESENT";
}
