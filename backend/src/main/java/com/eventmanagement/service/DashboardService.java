package com.eventmanagement.service;

import com.eventmanagement.dto.DashboardStats;
import com.eventmanagement.dto.EventResponse;
import com.eventmanagement.model.Event;
import com.eventmanagement.model.Payment;
import com.eventmanagement.model.Registration;
import com.eventmanagement.model.User;
import com.eventmanagement.repository.*;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.data.domain.PageRequest;
import org.springframework.data.domain.Sort;
import org.springframework.stereotype.Service;
import java.math.BigDecimal;
import java.util.HashMap;
import java.util.List;
import java.util.Map;
import java.util.stream.Collectors;

@Service
public class DashboardService {

    @Autowired private EventRepository eventRepository;
    @Autowired private UserRepository userRepository;
    @Autowired private RegistrationRepository registrationRepository;
    @Autowired private PaymentRepository paymentRepository;
    @Autowired private FeedbackRepository feedbackRepository;

    public DashboardStats getAdminStats() {
        DashboardStats stats = new DashboardStats();
        stats.setTotalEvents(eventRepository.count());
        stats.setTotalUsers(userRepository.count());
        stats.setTotalRegistrations(registrationRepository.count());

        List<Payment> completed = paymentRepository.findByStatus(Payment.PaymentStatus.COMPLETED);
        BigDecimal revenue = completed.stream()
                .map(Payment::getAmount)
                .reduce(BigDecimal.ZERO, BigDecimal::add);
        stats.setTotalRevenue(revenue);

        Map<String, Long> byStatus = new HashMap<>();
        for (Event.EventStatus status : Event.EventStatus.values()) {
            byStatus.put(status.name(), (long) eventRepository.findByStatus(status).size());
        }
        stats.setEventsByStatus(byStatus);

        List<EventResponse> recent = eventRepository
                .findAll(PageRequest.of(0, 5, Sort.by(Sort.Direction.DESC, "createdAt")))
                .stream()
                .map(EventResponse::from)
                .collect(Collectors.toList());
        stats.setRecentEvents(recent);

        return stats;
    }

    public DashboardStats getOrganizerStats(User organizer) {
        DashboardStats stats = new DashboardStats();
        List<Event> events = eventRepository.findByOrganizer(organizer);
        stats.setTotalEvents((long) events.size());

        long totalReg = events.stream()
                .mapToLong(e -> registrationRepository.findByEvent(e).size())
                .sum();
        stats.setTotalRegistrations(totalReg);

        Map<String, Long> byStatus = new HashMap<>();
        for (Event.EventStatus status : Event.EventStatus.values()) {
            byStatus.put(status.name(), events.stream().filter(e -> e.getStatus() == status).count());
        }
        stats.setEventsByStatus(byStatus);

        List<EventResponse> recentEvents = events.stream()
                .limit(5)
                .map(EventResponse::from)
                .collect(Collectors.toList());
        stats.setRecentEvents(recentEvents);

        return stats;
    }

    public Map<String, Object> getEventAnalytics(Long eventId) {
        Event event = eventRepository.findById(eventId).orElseThrow();
        Map<String, Object> analytics = new HashMap<>();
        analytics.put("totalRegistrations", registrationRepository.findByEvent(event).size());
        analytics.put("confirmedRegistrations",
                registrationRepository.countByEventAndStatus(event, Registration.RegistrationStatus.CONFIRMED));
        analytics.put("averageRating", feedbackRepository.getAverageRatingByEvent(event));
        analytics.put("feedbackCount", feedbackRepository.findByEvent(event).size());
        analytics.put("capacity", event.getMaxCapacity());
        analytics.put("registered", event.getRegisteredCount());
        return analytics;
    }

    public Map<String, BigDecimal> getRevenueByMonth() {
        List<Payment> payments = paymentRepository.findByStatus(Payment.PaymentStatus.COMPLETED);
        Map<String, BigDecimal> revenueByMonth = new HashMap<>();
        for (Payment p : payments) {
            if (p.getPaymentDate() != null) {
                String key = p.getPaymentDate().getYear() + "-" +
                        String.format("%02d", p.getPaymentDate().getMonthValue());
                revenueByMonth.merge(key, p.getAmount(), BigDecimal::add);
            }
        }
        return revenueByMonth;
    }

    public Map<String, Long> getRegistrationTrends() {
        List<Registration> registrations = registrationRepository.findAll();
        Map<String, Long> trends = new HashMap<>();
        for (Registration r : registrations) {
            if (r.getRegistrationDate() != null) {
                String key = r.getRegistrationDate().getYear() + "-" +
                        String.format("%02d", r.getRegistrationDate().getMonthValue());
                trends.merge(key, 1L, Long::sum);
            }
        }
        return trends;
    }
}
