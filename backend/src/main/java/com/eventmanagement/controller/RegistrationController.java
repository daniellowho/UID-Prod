package com.eventmanagement.controller;

import com.eventmanagement.dto.RegistrationRequest;
import com.eventmanagement.dto.RegistrationResponse;
import com.eventmanagement.model.User;
import com.eventmanagement.repository.UserRepository;
import com.eventmanagement.service.RegistrationService;
import jakarta.validation.Valid;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.http.ResponseEntity;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.security.core.context.SecurityContextHolder;
import org.springframework.web.bind.annotation.*;
import java.util.List;

@RestController
@RequestMapping("/api/registrations")
public class RegistrationController {

    @Autowired private RegistrationService registrationService;
    @Autowired private UserRepository userRepository;

    @PostMapping
    public ResponseEntity<RegistrationResponse> register(@Valid @RequestBody RegistrationRequest request) {
        User user = getCurrentUser();
        return ResponseEntity.ok(registrationService.registerForEvent(user, request));
    }

    @GetMapping("/my")
    public ResponseEntity<List<RegistrationResponse>> getMyRegistrations() {
        User user = getCurrentUser();
        return ResponseEntity.ok(registrationService.getUserRegistrations(user));
    }

    @DeleteMapping("/{id}")
    public ResponseEntity<Void> cancelRegistration(@PathVariable Long id) {
        User user = getCurrentUser();
        registrationService.cancelRegistration(id, user);
        return ResponseEntity.noContent().build();
    }

    @PostMapping("/checkin/{ticketNumber}")
    @PreAuthorize("hasAnyRole('ORGANIZER', 'ADMIN')")
    public ResponseEntity<String> checkIn(@PathVariable String ticketNumber) {
        return ResponseEntity.ok(registrationService.checkIn(ticketNumber));
    }

    @GetMapping("/event/{eventId}")
    @PreAuthorize("hasAnyRole('ORGANIZER', 'ADMIN')")
    public ResponseEntity<List<RegistrationResponse>> getEventRegistrations(@PathVariable Long eventId) {
        return ResponseEntity.ok(registrationService.getEventRegistrations(eventId));
    }

    private User getCurrentUser() {
        String username = SecurityContextHolder.getContext().getAuthentication().getName();
        return userRepository.findByUsername(username).orElseThrow();
    }
}
