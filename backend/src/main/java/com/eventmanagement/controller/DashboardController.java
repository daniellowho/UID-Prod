package com.eventmanagement.controller;

import com.eventmanagement.dto.DashboardStats;
import com.eventmanagement.model.User;
import com.eventmanagement.repository.UserRepository;
import com.eventmanagement.service.DashboardService;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.http.ResponseEntity;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.security.core.context.SecurityContextHolder;
import org.springframework.web.bind.annotation.*;
import java.math.BigDecimal;
import java.util.Map;

@RestController
@RequestMapping("/api/dashboard")
public class DashboardController {

    @Autowired private DashboardService dashboardService;
    @Autowired private UserRepository userRepository;

    @GetMapping("/admin/stats")
    @PreAuthorize("hasRole('ADMIN')")
    public ResponseEntity<DashboardStats> getAdminStats() {
        return ResponseEntity.ok(dashboardService.getAdminStats());
    }

    @GetMapping("/organizer/stats")
    @PreAuthorize("hasAnyRole('ORGANIZER', 'ADMIN')")
    public ResponseEntity<DashboardStats> getOrganizerStats() {
        User user = getCurrentUser();
        return ResponseEntity.ok(dashboardService.getOrganizerStats(user));
    }

    @GetMapping("/analytics/revenue")
    @PreAuthorize("hasRole('ADMIN')")
    public ResponseEntity<Map<String, BigDecimal>> getRevenueAnalytics() {
        return ResponseEntity.ok(dashboardService.getRevenueByMonth());
    }

    @GetMapping("/analytics/registrations")
    @PreAuthorize("hasAnyRole('ADMIN', 'ORGANIZER')")
    public ResponseEntity<Map<String, Long>> getRegistrationTrends() {
        return ResponseEntity.ok(dashboardService.getRegistrationTrends());
    }

    @GetMapping("/analytics/event/{eventId}")
    @PreAuthorize("hasAnyRole('ORGANIZER', 'ADMIN')")
    public ResponseEntity<Map<String, Object>> getEventAnalytics(@PathVariable Long eventId) {
        return ResponseEntity.ok(dashboardService.getEventAnalytics(eventId));
    }

    private User getCurrentUser() {
        String username = SecurityContextHolder.getContext().getAuthentication().getName();
        return userRepository.findByUsername(username).orElseThrow();
    }
}
