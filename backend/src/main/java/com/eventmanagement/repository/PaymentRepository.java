package com.eventmanagement.repository;

import com.eventmanagement.model.Payment;
import com.eventmanagement.model.Registration;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;
import java.util.List;
import java.util.Optional;

@Repository
public interface PaymentRepository extends JpaRepository<Payment, Long> {
    Optional<Payment> findByRegistration(Registration registration);
    List<Payment> findByStatus(Payment.PaymentStatus status);
}
