package com.eventmanagement.repository;

import com.eventmanagement.model.Category;
import com.eventmanagement.model.Event;
import com.eventmanagement.model.User;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;
import org.springframework.stereotype.Repository;
import java.math.BigDecimal;
import java.util.List;

@Repository
public interface EventRepository extends JpaRepository<Event, Long> {
    List<Event> findByStatus(Event.EventStatus status);
    List<Event> findByCategory(Category category);
    List<Event> findByOrganizer(User organizer);
    List<Event> findByIsFeaturedTrue();
    List<Event> findTop10ByOrderByRegisteredCountDesc();

    @Query("SELECT e FROM Event e WHERE e.status = 'PUBLISHED' AND " +
           "(LOWER(e.title) LIKE LOWER(CONCAT('%', :keyword, '%')) OR " +
           "LOWER(e.city) LIKE LOWER(CONCAT('%', :keyword, '%')) OR " +
           "LOWER(e.state) LIKE LOWER(CONCAT('%', :keyword, '%')))")
    Page<Event> searchByKeyword(@Param("keyword") String keyword, Pageable pageable);

    @Query("SELECT e FROM Event e WHERE e.status = 'PUBLISHED' AND " +
           "(:keyword IS NULL OR LOWER(e.title) LIKE LOWER(CONCAT('%', :keyword, '%'))) AND " +
           "(:city IS NULL OR LOWER(e.city) LIKE LOWER(CONCAT('%', :city, '%'))) AND " +
           "(:categoryId IS NULL OR e.category.id = :categoryId) AND " +
           "(:minPrice IS NULL OR e.ticketPrice >= :minPrice) AND " +
           "(:maxPrice IS NULL OR e.ticketPrice <= :maxPrice)")
    Page<Event> searchEvents(@Param("keyword") String keyword,
                             @Param("city") String city,
                             @Param("categoryId") Long categoryId,
                             @Param("minPrice") BigDecimal minPrice,
                             @Param("maxPrice") BigDecimal maxPrice,
                             Pageable pageable);

    Page<Event> findByStatus(Event.EventStatus status, Pageable pageable);
}
