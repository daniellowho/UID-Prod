package com.eventmanagement.controller;

import com.eventmanagement.dto.EventRequest;
import com.eventmanagement.dto.EventResponse;
import com.eventmanagement.model.User;
import com.eventmanagement.repository.UserRepository;
import com.eventmanagement.service.EventService;
import jakarta.validation.Valid;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.PageRequest;
import org.springframework.data.domain.Pageable;
import org.springframework.data.domain.Sort;
import org.springframework.http.ResponseEntity;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.security.core.context.SecurityContextHolder;
import org.springframework.web.bind.annotation.*;
import java.math.BigDecimal;
import java.util.List;

@RestController
@RequestMapping("/api/events")
public class EventController {

    @Autowired private EventService eventService;
    @Autowired private UserRepository userRepository;

    @GetMapping("/public")
    public ResponseEntity<Page<EventResponse>> getPublishedEvents(
            @RequestParam(defaultValue = "0") int page,
            @RequestParam(defaultValue = "10") int size) {
        Pageable pageable = PageRequest.of(page, size, Sort.by("startDateTime").ascending());
        return ResponseEntity.ok(eventService.getAllPublishedEvents(pageable));
    }

    @GetMapping("/public/{id}")
    public ResponseEntity<EventResponse> getEventById(@PathVariable Long id) {
        return ResponseEntity.ok(eventService.getEventById(id));
    }

    @GetMapping("/public/featured")
    public ResponseEntity<List<EventResponse>> getFeaturedEvents() {
        return ResponseEntity.ok(eventService.getFeaturedEvents());
    }

    @GetMapping("/public/search")
    public ResponseEntity<Page<EventResponse>> searchEvents(
            @RequestParam(required = false) String keyword,
            @RequestParam(required = false) String city,
            @RequestParam(required = false) Long categoryId,
            @RequestParam(required = false) BigDecimal minPrice,
            @RequestParam(required = false) BigDecimal maxPrice,
            @RequestParam(defaultValue = "0") int page,
            @RequestParam(defaultValue = "10") int size) {
        Pageable pageable = PageRequest.of(page, size);
        return ResponseEntity.ok(eventService.searchEvents(keyword, city, categoryId, minPrice, maxPrice, pageable));
    }

    @PostMapping
    @PreAuthorize("hasAnyRole('ORGANIZER', 'ADMIN')")
    public ResponseEntity<EventResponse> createEvent(@Valid @RequestBody EventRequest request) {
        User organizer = getCurrentUser();
        return ResponseEntity.ok(eventService.createEvent(request, organizer));
    }

    @PutMapping("/{id}")
    @PreAuthorize("hasAnyRole('ORGANIZER', 'ADMIN')")
    public ResponseEntity<EventResponse> updateEvent(@PathVariable Long id,
                                                      @Valid @RequestBody EventRequest request) {
        User organizer = getCurrentUser();
        return ResponseEntity.ok(eventService.updateEvent(id, request, organizer));
    }

    @DeleteMapping("/{id}")
    @PreAuthorize("hasRole('ADMIN')")
    public ResponseEntity<Void> deleteEvent(@PathVariable Long id) {
        eventService.deleteEvent(id);
        return ResponseEntity.noContent().build();
    }

    @PutMapping("/{id}/publish")
    @PreAuthorize("hasAnyRole('ORGANIZER', 'ADMIN')")
    public ResponseEntity<EventResponse> publishEvent(@PathVariable Long id) {
        User organizer = getCurrentUser();
        return ResponseEntity.ok(eventService.publishEvent(id, organizer));
    }

    @GetMapping("/my")
    @PreAuthorize("hasAnyRole('ORGANIZER', 'ADMIN')")
    public ResponseEntity<List<EventResponse>> getMyEvents() {
        User organizer = getCurrentUser();
        return ResponseEntity.ok(eventService.getEventsByOrganizer(organizer));
    }

    private User getCurrentUser() {
        String username = SecurityContextHolder.getContext().getAuthentication().getName();
        return userRepository.findByUsername(username).orElseThrow();
    }
}
