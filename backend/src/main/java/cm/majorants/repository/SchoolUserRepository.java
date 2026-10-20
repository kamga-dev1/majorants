package cm.majorants.repository;

import cm.majorants.model.SchoolUser;
import org.springframework.data.jpa.repository.JpaRepository;

public interface SchoolUserRepository extends JpaRepository<SchoolUser, String> {
}
