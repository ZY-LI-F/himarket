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
@Table(name = "agent_room_config")
@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class AgentRoomConfigEntity {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    @Column(name = "id")
    private Long id;

    @Column(name = "room_uid", nullable = false, unique = true, length = 64)
    private String roomUid;

    @Column(name = "config_json", nullable = false, columnDefinition = "longtext")
    private String configJson;

    @Column(name = "version", nullable = false)
    private Long version;

    @Column(name = "updated_at", nullable = false)
    private LocalDateTime updatedAt;
}
