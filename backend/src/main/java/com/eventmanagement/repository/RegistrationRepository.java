package com.eventmanagement.repository;

import com.eventmanagement.model.Event;
import com.eventmanagement.model.Registration;
import com.eventmanagement.model.User;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;
import java.util.List;
import java.util.Optional;

@Repository
public interface RegistrationRepository extends JpaRepository<Registration, Long> {
    List<Registration> findByUser(User user);
    List<Registration> findByEvent(Event event);
    Optional<Registration> findByUserAndEvent(User user, Event event);
    long countByEventAndStatus(Event event, Registration.RegistrationStatus status);
    List<Registration> findByUserAndStatus(User user, Registration.RegistrationStatus status);
}
