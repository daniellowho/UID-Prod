package com.eventmanagement.repository;

import com.eventmanagement.model.Event;
import com.eventmanagement.model.User;
import com.eventmanagement.model.Waitlist;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;
import java.util.List;
import java.util.Optional;

@Repository
public interface WaitlistRepository extends JpaRepository<Waitlist, Long> {
    List<Waitlist> findByEvent(Event event);
    Optional<Waitlist> findByUserAndEvent(User user, Event event);
    long countByEvent(Event event);
}
