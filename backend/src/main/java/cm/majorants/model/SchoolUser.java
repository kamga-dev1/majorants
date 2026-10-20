package cm.majorants.model;

import jakarta.persistence.Entity;
import jakarta.persistence.Id;
import jakarta.persistence.Table;
import lombok.Data;
import lombok.NoArgsConstructor;

@Entity
@Table(name = "majorants_users")
@Data
@NoArgsConstructor
public class SchoolUser {
    @Id
    private String username;
    private String passwordHash;
    private String role;
    private String studentId;
    private String schoolClass;
}
