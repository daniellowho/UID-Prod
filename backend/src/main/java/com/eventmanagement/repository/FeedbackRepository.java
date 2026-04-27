package com.eventmanagement.repository;

import com.eventmanagement.model.Event;
import com.eventmanagement.model.Feedback;
import com.eventmanagement.model.User;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;
import org.springframework.stereotype.Repository;
import java.util.List;

@Repository
public interface FeedbackRepository extends JpaRepository<Feedback, Long> {
    List<Feedback> findByEvent(Event event);
    List<Feedback> findByUser(User user);

    @Query("SELECT AVG(f.rating) FROM Feedback f WHERE f.event = :event")
    Double getAverageRatingByEvent(@Param("event") Event event);
}
