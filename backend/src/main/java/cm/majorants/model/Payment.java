package cm.majorants.model;

import jakarta.persistence.Entity;
import jakarta.persistence.Id;
import jakarta.persistence.Table;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.Positive;
import lombok.Data;
import lombok.NoArgsConstructor;

import java.math.BigDecimal;
import java.time.LocalDate;
import java.util.UUID;

@Entity
@Table(name = "majorants_payments")
@Data
@NoArgsConstructor
public class Payment {
    @Id
    private String id = UUID.randomUUID().toString();
    @NotBlank
    private String studentId;
    @NotBlank
    private String studentName;
    @Positive
    private BigDecimal amount;
    private LocalDate paymentDate = LocalDate.now();
    private LocalDate dueDate;
    @NotBlank
    private String status = "PAYE";
    private String note;
}
