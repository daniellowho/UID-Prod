package com.eventmanagement.dto;

import com.eventmanagement.model.Event;
import lombok.Data;
import java.math.BigDecimal;
import java.time.LocalDateTime;

@Data
public class EventResponse {
    private Long id;
    private String title;
    private String description;
    private LocalDateTime startDateTime;
    private LocalDateTime endDateTime;
    private String venue;
    private String address;
    private String city;
    private String state;
    private String country;
    private String categoryName;
    private Long categoryId;
    private Long organizerId;
    private String organizerName;
    private Integer maxCapacity;
    private Integer registeredCount;
    private BigDecimal ticketPrice;
    private String imageUrl;
    private Event.EventStatus status;
    private boolean isFeatured;
    private LocalDateTime createdAt;
    private Double averageRating;
    private Long feedbackCount;

    public static EventResponse from(Event event) {
        EventResponse r = new EventResponse();
        r.setId(event.getId());
        r.setTitle(event.getTitle());
        r.setDescription(event.getDescription());
        r.setStartDateTime(event.getStartDateTime());
        r.setEndDateTime(event.getEndDateTime());
        r.setVenue(event.getVenue());
        r.setAddress(event.getAddress());
        r.setCity(event.getCity());
        r.setState(event.getState());
        r.setCountry(event.getCountry());
        r.setMaxCapacity(event.getMaxCapacity());
        r.setRegisteredCount(event.getRegisteredCount());
        r.setTicketPrice(event.getTicketPrice());
        r.setImageUrl(event.getImageUrl());
        r.setStatus(event.getStatus());
        r.setFeatured(event.isFeatured());
        r.setCreatedAt(event.getCreatedAt());
        if (event.getCategory() != null) {
            r.setCategoryName(event.getCategory().getName());
            r.setCategoryId(event.getCategory().getId());
        }
        if (event.getOrganizer() != null) {
            r.setOrganizerId(event.getOrganizer().getId());
            r.setOrganizerName(event.getOrganizer().getFullName());
        }
        return r;
    }
}
