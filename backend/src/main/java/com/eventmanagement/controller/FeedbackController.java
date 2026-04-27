package com.eventmanagement.controller;

import com.eventmanagement.dto.FeedbackRequest;
import com.eventmanagement.model.Feedback;
import com.eventmanagement.model.User;
import com.eventmanagement.repository.UserRepository;
import com.eventmanagement.service.FeedbackService;
import jakarta.validation.Valid;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.http.ResponseEntity;
import org.springframework.security.core.context.SecurityContextHolder;
import org.springframework.web.bind.annotation.*;
import java.util.List;

@RestController
@RequestMapping("/api/feedback")
public class FeedbackController {

    @Autowired private FeedbackService feedbackService;
    @Autowired private UserRepository userRepository;

    @PostMapping
    public ResponseEntity<Feedback> submitFeedback(@Valid @RequestBody FeedbackRequest request) {
        User user = getCurrentUser();
        return ResponseEntity.ok(feedbackService.submitFeedback(user, request));
    }

    @GetMapping("/event/{eventId}")
    public ResponseEntity<List<Feedback>> getEventFeedback(@PathVariable Long eventId) {
        return ResponseEntity.ok(feedbackService.getEventFeedback(eventId));
    }

    @GetMapping("/my")
    public ResponseEntity<List<Feedback>> getMyFeedback() {
        User user = getCurrentUser();
        return ResponseEntity.ok(feedbackService.getUserFeedback(user));
    }

    private User getCurrentUser() {
        String username = SecurityContextHolder.getContext().getAuthentication().getName();
        return userRepository.findByUsername(username).orElseThrow();
    }
}
