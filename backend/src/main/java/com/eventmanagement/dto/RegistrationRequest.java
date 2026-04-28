package com.eventmanagement.dto;

import jakarta.validation.constraints.Min;
import jakarta.validation.constraints.NotNull;
import lombok.Data;

@Data
public class RegistrationRequest {
    @NotNull
    private Long eventId;

    @Min(1)
    private Integer numberOfTickets = 1;

    private String paymentMethod;
}
