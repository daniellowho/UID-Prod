package com.eventmanagement.repository;

import com.eventmanagement.model.Registration;
import com.eventmanagement.model.Ticket;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;
import java.util.List;
import java.util.Optional;

@Repository
public interface TicketRepository extends JpaRepository<Ticket, Long> {
    List<Ticket> findByRegistration(Registration registration);
    Optional<Ticket> findByTicketNumber(String ticketNumber);
}
