package cm.majorants.controller;

import cm.majorants.model.SchoolUser;
import cm.majorants.repository.SchoolUserRepository;
import org.springframework.security.core.Authentication;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

import java.util.Map;

@RestController
@RequestMapping("/api/auth")
public class AuthController {
    private final SchoolUserRepository users;

    public AuthController(SchoolUserRepository users) {
        this.users = users;
    }

    @GetMapping("/me")
    public Map<String, String> currentUser(Authentication authentication) {
        SchoolUser user = users.findById(authentication.getName()).orElseThrow();
        return Map.of("username", user.getUsername(), "role", user.getRole());
    }
}
