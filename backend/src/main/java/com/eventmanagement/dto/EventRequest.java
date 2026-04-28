package com.eventmanagement.dto;

import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotNull;
import lombok.Data;
import java.math.BigDecimal;
import java.time.LocalDateTime;

@Data
public class EventRequest {
    @NotBlank
    private String title;
    private String description;

    @NotNull
    private LocalDateTime startDateTime;

    @NotNull
    private LocalDateTime endDateTime;

    private String venue;
    private String address;
    private String city;
    private String state;
    private String country;
    private Long categoryId;
    private Integer maxCapacity;
    private BigDecimal ticketPrice;
    private String imageUrl;
    private boolean isFeatured;
}
