package com.eventmanagement.model;

import jakarta.persistence.*;
import lombok.*;
import java.time.LocalDateTime;

@Entity
@Table(name = "tickets")
@Data
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class Ticket {
    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "registration_id", nullable = false)
    private Registration registration;

    @Column(unique = true, nullable = false)
    private String ticketNumber;

    private LocalDateTime issuedAt;
    private boolean isValid = true;
    private LocalDateTime checkInTime;

    @PrePersist
    protected void onCreate() {
        issuedAt = LocalDateTime.now();
    }
}
