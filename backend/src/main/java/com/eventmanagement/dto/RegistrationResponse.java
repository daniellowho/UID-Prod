package com.eventmanagement.dto;

import com.eventmanagement.model.Registration;
import lombok.Data;
import java.math.BigDecimal;
import java.time.LocalDateTime;

@Data
public class RegistrationResponse {
    private Long id;
    private Long eventId;
    private String eventTitle;
    private LocalDateTime eventStartDateTime;
    private String venue;
    private Registration.RegistrationStatus status;
    private Integer numberOfTickets;
    private BigDecimal totalAmount;
    private String qrCode;
    private LocalDateTime registrationDate;

    public static RegistrationResponse from(Registration registration) {
        RegistrationResponse r = new RegistrationResponse();
        r.setId(registration.getId());
        r.setStatus(registration.getStatus());
        r.setNumberOfTickets(registration.getNumberOfTickets());
        r.setTotalAmount(registration.getTotalAmount());
        r.setQrCode(registration.getQrCode());
        r.setRegistrationDate(registration.getRegistrationDate());
        if (registration.getEvent() != null) {
            r.setEventId(registration.getEvent().getId());
            r.setEventTitle(registration.getEvent().getTitle());
            r.setEventStartDateTime(registration.getEvent().getStartDateTime());
            r.setVenue(registration.getEvent().getVenue());
        }
        return r;
    }
}
