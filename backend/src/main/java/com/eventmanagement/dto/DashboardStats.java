package com.eventmanagement.dto;

import lombok.Data;
import java.math.BigDecimal;
import java.util.List;
import java.util.Map;

@Data
public class DashboardStats {
    private Long totalEvents;
    private Long totalUsers;
    private Long totalRegistrations;
    private BigDecimal totalRevenue;
    private Map<String, Long> eventsByStatus;
    private List<EventResponse> recentEvents;
}
