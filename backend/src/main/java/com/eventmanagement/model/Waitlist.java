package com.eventmanagement.model;

import jakarta.persistence.*;
import lombok.*;
import java.time.LocalDateTime;

@Entity
@Table(name = "waitlist")
@Data
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class Waitlist {
    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "user_id", nullable = false)
    private User user;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "event_id", nullable = false)
    private Event event;

    private LocalDateTime addedAt;
    private boolean notified = false;

    @PrePersist
    protected void onCreate() {
        addedAt = LocalDateTime.now();
    }
}
