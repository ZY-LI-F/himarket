package com.alibaba.himarket.service.agent;

import java.time.LocalDateTime;
import java.util.Map;
import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class TaskEvent {

    private Integer seq;

    private String kind;

    private String agentId;

    private Map<String, Object> payload;

    private LocalDateTime timestamp;
}
