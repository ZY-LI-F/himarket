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
@Table(name = "agent_room")
@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class AgentRoomEntity {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    @Column(name = "id")
    private Long id;

    @Column(name = "room_uid", nullable = false, unique = true, length = 64)
    private String roomUid;

    @Column(name = "workspace_uid", nullable = false, length = 64)
    private String workspaceUid;

    @Column(name = "tenant_id", nullable = false, length = 64)
    private String tenantId;

    @Column(name = "name", nullable = false, length = 128)
    private String name;

    @Column(name = "model_id", length = 64)
    private String modelId;

    @Column(name = "team_template_id", length = 64)
    private String teamTemplateId;

    @Column(name = "file_root", length = 256)
    private String fileRoot;

    @Column(name = "permission_json", columnDefinition = "text")
    private String permissionJson;

    @Column(name = "created_at", nullable = false)
    private LocalDateTime createdAt;

    @Column(name = "updated_at", nullable = false)
    private LocalDateTime updatedAt;

    @Column(name = "deleted_at")
    private LocalDateTime deletedAt;
}
