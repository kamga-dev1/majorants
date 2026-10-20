package cm.majorants;

import cm.majorants.model.SchoolUser;
import cm.majorants.repository.SchoolUserRepository;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.boot.CommandLineRunner;
import org.springframework.boot.SpringApplication;
import org.springframework.boot.autoconfigure.SpringBootApplication;
import org.springframework.context.annotation.Bean;
import org.springframework.security.crypto.password.PasswordEncoder;

import java.security.SecureRandom;
import java.util.Base64;

@SpringBootApplication
public class MajorantsApplication {
    private static final Logger log = LoggerFactory.getLogger(MajorantsApplication.class);

    public static void main(String[] args) {
        SpringApplication.run(MajorantsApplication.class, args);
    }

    @Bean
    CommandLineRunner createInitialAccount(SchoolUserRepository users, PasswordEncoder encoder) {
        return args -> {
            if (users.count() == 0) {
                byte[] secret = new byte[18];
                new SecureRandom().nextBytes(secret);
                String password = Base64.getUrlEncoder().withoutPadding().encodeToString(secret);
                SchoolUser initialUser = new SchoolUser();
                initialUser.setUsername("promoteur");
                initialUser.setPasswordHash(encoder.encode(password));
                initialUser.setRole("PROMOTEUR");
                users.save(initialUser);
                log.warn("Compte initial créé. Identifiant : promoteur ; mot de passe temporaire : {}", password);
            }
        };
    }
}
