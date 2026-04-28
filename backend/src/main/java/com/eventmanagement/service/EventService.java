package com.eventmanagement.service;

import com.eventmanagement.dto.EventRequest;
import com.eventmanagement.dto.EventResponse;
import com.eventmanagement.exception.BadRequestException;
import com.eventmanagement.exception.ResourceNotFoundException;
import com.eventmanagement.model.Category;
import com.eventmanagement.model.Event;
import com.eventmanagement.model.User;
import com.eventmanagement.repository.CategoryRepository;
import com.eventmanagement.repository.EventRepository;
import com.eventmanagement.repository.FeedbackRepository;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.stereotype.Service;
import java.math.BigDecimal;
import java.util.List;
import java.util.stream.Collectors;

@Service
public class EventService {

    @Autowired private EventRepository eventRepository;
    @Autowired private CategoryRepository categoryRepository;
    @Autowired private FeedbackRepository feedbackRepository;

    public EventResponse createEvent(EventRequest request, User organizer) {
        Event event = buildEventFromRequest(request, new Event());
        event.setOrganizer(organizer);
        event.setStatus(Event.EventStatus.DRAFT);
        Event saved = eventRepository.save(event);
        return toResponse(saved);
    }

    public EventResponse updateEvent(Long id, EventRequest request, User organizer) {
        Event event = getEventEntityById(id);
        if (!event.getOrganizer().getId().equals(organizer.getId()) &&
            organizer.getRole() != User.Role.ADMIN) {
            throw new BadRequestException("Not authorized to update this event");
        }
        buildEventFromRequest(request, event);
        return toResponse(eventRepository.save(event));
    }

    public void deleteEvent(Long id) {
        Event event = getEventEntityById(id);
        event.setStatus(Event.EventStatus.CANCELLED);
        eventRepository.save(event);
    }

    public EventResponse getEventById(Long id) {
        return toResponse(getEventEntityById(id));
    }

    public Event getEventEntityById(Long id) {
        return eventRepository.findById(id)
                .orElseThrow(() -> new ResourceNotFoundException("Event not found: " + id));
    }

    public Page<EventResponse> getAllPublishedEvents(Pageable pageable) {
        return eventRepository.findByStatus(Event.EventStatus.PUBLISHED, pageable).map(this::toResponse);
    }

    public List<EventResponse> getFeaturedEvents() {
        return eventRepository.findByIsFeaturedTrue().stream().map(this::toResponse).collect(Collectors.toList());
    }

    public Page<EventResponse> searchEvents(String keyword, String city, Long categoryId,
                                            BigDecimal minPrice, BigDecimal maxPrice, Pageable pageable) {
        return eventRepository.searchEvents(keyword, city, categoryId, minPrice, maxPrice, pageable)
                .map(this::toResponse);
    }

    public List<EventResponse> getEventsByOrganizer(User organizer) {
        return eventRepository.findByOrganizer(organizer).stream().map(this::toResponse).collect(Collectors.toList());
    }

    public EventResponse publishEvent(Long id, User organizer) {
        Event event = getEventEntityById(id);
        if (!event.getOrganizer().getId().equals(organizer.getId()) &&
            organizer.getRole() != User.Role.ADMIN) {
            throw new BadRequestException("Not authorized");
        }
        event.setStatus(Event.EventStatus.PUBLISHED);
        return toResponse(eventRepository.save(event));
    }

    public EventResponse cancelEvent(Long id) {
        Event event = getEventEntityById(id);
        event.setStatus(Event.EventStatus.CANCELLED);
        return toResponse(eventRepository.save(event));
    }

    public long getTotalEvents() {
        return eventRepository.count();
    }

    private Event buildEventFromRequest(EventRequest request, Event event) {
        event.setTitle(request.getTitle());
        event.setDescription(request.getDescription());
        event.setStartDateTime(request.getStartDateTime());
        event.setEndDateTime(request.getEndDateTime());
        event.setVenue(request.getVenue());
        event.setAddress(request.getAddress());
        event.setCity(request.getCity());
        event.setState(request.getState());
        event.setCountry(request.getCountry());
        event.setMaxCapacity(request.getMaxCapacity());
        event.setTicketPrice(request.getTicketPrice() != null ? request.getTicketPrice() : BigDecimal.ZERO);
        event.setImageUrl(request.getImageUrl());
        event.setFeatured(request.isFeatured());
        if (request.getCategoryId() != null) {
            Category category = categoryRepository.findById(request.getCategoryId()).orElse(null);
            event.setCategory(category);
        }
        return event;
    }

    private EventResponse toResponse(Event event) {
        EventResponse response = EventResponse.from(event);
        Double avgRating = feedbackRepository.getAverageRatingByEvent(event);
        response.setAverageRating(avgRating);
        long feedbackCount = feedbackRepository.findByEvent(event).size();
        response.setFeedbackCount(feedbackCount);
        return response;
    }
}
