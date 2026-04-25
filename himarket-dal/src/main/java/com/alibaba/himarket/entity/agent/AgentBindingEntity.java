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
@Table(name = "agent_binding")
@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class AgentBindingEntity {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    @Column(name = "id")
    private Long id;

    @Column(name = "binding_uid", nullable = false, unique = true, length = 64)
    private String bindingUid;

    @Column(name = "room_uid", nullable = false, length = 64)
    private String roomUid;

    @Column(name = "kind", nullable = false, length = 16)
    private String kind;

    @Column(name = "product_id", nullable = false, length = 64)
    private String productId;

    @Column(name = "version", nullable = false, length = 32)
    private String version;

    @Column(name = "status", nullable = false, length = 16)
    private String status;

    @Column(name = "created_at", nullable = false)
    private LocalDateTime createdAt;

    @Column(name = "deleted_at")
    private LocalDateTime deletedAt;
}
