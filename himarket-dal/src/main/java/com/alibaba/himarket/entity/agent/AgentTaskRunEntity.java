package com.alibaba.himarket.entity.agent;

import jakarta.persistence.Column;
import jakarta.persistence.Entity;
import jakarta.persistence.GeneratedValue;
import jakarta.persistence.GenerationType;
import jakarta.persistence.Id;
import jakarta.persistence.Table;
import java.time.LocalDateTime;
import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

@Entity
@Table(name = "agent_task_run")
@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class AgentTaskRunEntity {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    @Column(name = "id")
    private Long id;

    @Column(name = "task_uid", nullable = false, unique = true, length = 64)
    private String taskUid;

    @Column(name = "room_uid", nullable = false, length = 64)
    private String roomUid;

    @Column(name = "tenant_id", nullable = false, length = 64)
    private String tenantId;

    @Column(name = "status", nullable = false, length = 16)
    private String status;

    @Column(name = "prompt", columnDefinition = "longtext")
    private String prompt;

    @Column(name = "plan_json", columnDefinition = "longtext")
    private String planJson;

    @Column(name = "events_json", columnDefinition = "longtext")
    private String eventsJson;

    @Column(name = "artifacts_json", columnDefinition = "longtext")
    private String artifactsJson;

    @Column(name = "failure_excerpt", columnDefinition = "text")
    private String failureExcerpt;

    @Column(name = "created_at", nullable = false)
    private LocalDateTime createdAt;

    @Column(name = "completed_at")
    private LocalDateTime completedAt;
}
