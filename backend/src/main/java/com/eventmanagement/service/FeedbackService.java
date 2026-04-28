package com.eventmanagement.service;

import com.eventmanagement.dto.FeedbackRequest;
import com.eventmanagement.exception.BadRequestException;
import com.eventmanagement.exception.ResourceNotFoundException;
import com.eventmanagement.model.Event;
import com.eventmanagement.model.Feedback;
import com.eventmanagement.model.Registration;
import com.eventmanagement.model.User;
import com.eventmanagement.repository.EventRepository;
import com.eventmanagement.repository.FeedbackRepository;
import com.eventmanagement.repository.RegistrationRepository;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.stereotype.Service;
import java.util.List;

@Service
public class FeedbackService {

    @Autowired private FeedbackRepository feedbackRepository;
    @Autowired private EventRepository eventRepository;
    @Autowired private RegistrationRepository registrationRepository;

    public Feedback submitFeedback(User user, FeedbackRequest request) {
        Event event = eventRepository.findById(request.getEventId())
                .orElseThrow(() -> new ResourceNotFoundException("Event not found"));

        boolean hasRegistration = registrationRepository.findByUserAndEvent(user, event)
                .map(r -> r.getStatus() == Registration.RegistrationStatus.ATTENDED ||
                          r.getStatus() == Registration.RegistrationStatus.CONFIRMED)
                .orElse(false);

        if (!hasRegistration) {
            throw new BadRequestException("You must be registered for the event to submit feedback");
        }

        Feedback feedback = Feedback.builder()
                .user(user)
                .event(event)
                .rating(request.getRating())
                .comment(request.getComment())
                .build();
        return feedbackRepository.save(feedback);
    }

    public List<Feedback> getEventFeedback(Long eventId) {
        Event event = eventRepository.findById(eventId)
                .orElseThrow(() -> new ResourceNotFoundException("Event not found"));
        return feedbackRepository.findByEvent(event);
    }

    public List<Feedback> getUserFeedback(User user) {
        return feedbackRepository.findByUser(user);
    }

    public Double getAverageRating(Long eventId) {
        Event event = eventRepository.findById(eventId)
                .orElseThrow(() -> new ResourceNotFoundException("Event not found"));
        return feedbackRepository.getAverageRatingByEvent(event);
    }
}
