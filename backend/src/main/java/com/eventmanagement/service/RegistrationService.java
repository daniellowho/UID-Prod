package com.eventmanagement.service;

import com.eventmanagement.dto.RegistrationRequest;
import com.eventmanagement.dto.RegistrationResponse;
import com.eventmanagement.exception.BadRequestException;
import com.eventmanagement.exception.ResourceNotFoundException;
import com.eventmanagement.model.*;
import com.eventmanagement.repository.*;
import com.google.zxing.BarcodeFormat;
import com.google.zxing.WriterException;
import com.google.zxing.client.j2se.MatrixToImageWriter;
import com.google.zxing.common.BitMatrix;
import com.google.zxing.qrcode.QRCodeWriter;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import java.io.ByteArrayOutputStream;
import java.io.IOException;
import java.math.BigDecimal;
import java.util.Base64;
import java.util.List;
import java.util.UUID;
import java.util.stream.Collectors;

@Service
public class RegistrationService {

    @Autowired private RegistrationRepository registrationRepository;
    @Autowired private EventRepository eventRepository;
    @Autowired private TicketRepository ticketRepository;
    @Autowired private PaymentRepository paymentRepository;
    @Autowired private WaitlistRepository waitlistRepository;

    @Transactional
    public RegistrationResponse registerForEvent(User user, RegistrationRequest request) {
        Event event = eventRepository.findById(request.getEventId())
                .orElseThrow(() -> new ResourceNotFoundException("Event not found"));

        if (event.getStatus() != Event.EventStatus.PUBLISHED) {
            throw new BadRequestException("Event is not available for registration");
        }

        registrationRepository.findByUserAndEvent(user, event).ifPresent(r -> {
            if (r.getStatus() != Registration.RegistrationStatus.CANCELLED) {
                throw new BadRequestException("Already registered for this event");
            }
        });

        int requested = request.getNumberOfTickets() != null ? request.getNumberOfTickets() : 1;
        int available = event.getMaxCapacity() != null ? event.getMaxCapacity() - event.getRegisteredCount() : Integer.MAX_VALUE;

        if (available <= 0) {
            Waitlist waitlist = Waitlist.builder().user(user).event(event).build();
            waitlistRepository.save(waitlist);
            throw new BadRequestException("Event is full. You have been added to the waitlist.");
        }

        BigDecimal total = event.getTicketPrice().multiply(BigDecimal.valueOf(requested));

        Registration registration = Registration.builder()
                .user(user)
                .event(event)
                .numberOfTickets(requested)
                .totalAmount(total)
                .status(Registration.RegistrationStatus.CONFIRMED)
                .build();

        String ticketNumber = UUID.randomUUID().toString().toUpperCase();
        String qrCodeData = generateQrCode(ticketNumber);
        registration.setQrCode(qrCodeData);

        Registration saved = registrationRepository.save(registration);

        Ticket ticket = Ticket.builder()
                .registration(saved)
                .ticketNumber(ticketNumber)
                .isValid(true)
                .build();
        ticketRepository.save(ticket);

        Payment.PaymentMethod method = event.getTicketPrice().compareTo(BigDecimal.ZERO) == 0
                ? Payment.PaymentMethod.FREE
                : parsePaymentMethod(request.getPaymentMethod());

        Payment payment = Payment.builder()
                .registration(saved)
                .amount(total)
                .paymentMethod(method)
                .transactionId(UUID.randomUUID().toString())
                .status(Payment.PaymentStatus.COMPLETED)
                .build();
        paymentRepository.save(payment);

        event.setRegisteredCount(event.getRegisteredCount() + requested);
        eventRepository.save(event);

        return RegistrationResponse.from(saved);
    }

    @Transactional
    public void cancelRegistration(Long registrationId, User user) {
        Registration registration = registrationRepository.findById(registrationId)
                .orElseThrow(() -> new ResourceNotFoundException("Registration not found"));

        if (!registration.getUser().getId().equals(user.getId())) {
            throw new BadRequestException("Not authorized");
        }

        registration.setStatus(Registration.RegistrationStatus.CANCELLED);
        registrationRepository.save(registration);

        Event event = registration.getEvent();
        event.setRegisteredCount(Math.max(0, event.getRegisteredCount() - registration.getNumberOfTickets()));
        eventRepository.save(event);

        paymentRepository.findByRegistration(registration).ifPresent(p -> {
            p.setStatus(Payment.PaymentStatus.REFUNDED);
            paymentRepository.save(p);
        });
    }

    public List<RegistrationResponse> getUserRegistrations(User user) {
        return registrationRepository.findByUser(user).stream()
                .map(RegistrationResponse::from).collect(Collectors.toList());
    }

    public List<RegistrationResponse> getEventRegistrations(Long eventId) {
        Event event = eventRepository.findById(eventId)
                .orElseThrow(() -> new ResourceNotFoundException("Event not found"));
        return registrationRepository.findByEvent(event).stream()
                .map(RegistrationResponse::from).collect(Collectors.toList());
    }

    @Transactional
    public String checkIn(String ticketNumber) {
        Ticket ticket = ticketRepository.findByTicketNumber(ticketNumber)
                .orElseThrow(() -> new ResourceNotFoundException("Ticket not found"));
        if (!ticket.isValid()) {
            throw new BadRequestException("Ticket is invalid or already used");
        }
        ticket.setCheckInTime(java.time.LocalDateTime.now());
        ticket.setValid(false);
        ticketRepository.save(ticket);

        Registration registration = ticket.getRegistration();
        registration.setStatus(Registration.RegistrationStatus.ATTENDED);
        registrationRepository.save(registration);

        return "Check-in successful for ticket: " + ticketNumber;
    }

    private String generateQrCode(String data) {
        try {
            QRCodeWriter writer = new QRCodeWriter();
            BitMatrix matrix = writer.encode(data, BarcodeFormat.QR_CODE, 200, 200);
            ByteArrayOutputStream baos = new ByteArrayOutputStream();
            MatrixToImageWriter.writeToStream(matrix, "PNG", baos);
            return "data:image/png;base64," + Base64.getEncoder().encodeToString(baos.toByteArray());
        } catch (WriterException | IOException e) {
            return "QR:" + data;
        }
    }

    private Payment.PaymentMethod parsePaymentMethod(String method) {
        if (method == null) return Payment.PaymentMethod.CREDIT_CARD;
        try {
            return Payment.PaymentMethod.valueOf(method.toUpperCase());
        } catch (IllegalArgumentException e) {
            return Payment.PaymentMethod.CREDIT_CARD;
        }
    }
}
