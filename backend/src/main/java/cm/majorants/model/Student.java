package cm.majorants.model;

import jakarta.persistence.Entity;
import jakarta.persistence.Id;
import jakarta.persistence.Table;
import jakarta.validation.constraints.NotBlank;
import lombok.Data;
import lombok.NoArgsConstructor;

import java.util.UUID;

@Entity
@Table(name = "majorants_students")
@Data
@NoArgsConstructor
public class Student {
    @Id
    private String id = UUID.randomUUID().toString();
    @NotBlank
    private String name;
    @NotBlank
    private String schoolClass;
    private String guardianName;
    private String phone;
    private boolean active = true;
}
