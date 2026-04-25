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
@Table(name = "agent_team_template")
@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class AgentTeamTemplateEntity {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    @Column(name = "id")
    private Long id;

    @Column(name = "template_id", nullable = false, unique = true, length = 64)
    private String templateId;

    @Column(name = "name", nullable = false, length = 128)
    private String name;

    @Column(name = "version", nullable = false, length = 32)
    private String version;

    @Column(name = "manager_profile_json", nullable = false, columnDefinition = "text")
    private String managerProfileJson;

    @Column(name = "workers_profile_json", nullable = false, columnDefinition = "text")
    private String workersProfileJson;

    @Column(name = "default_skills", columnDefinition = "text")
    private String defaultSkills;

    @Column(name = "default_mcps", columnDefinition = "text")
    private String defaultMcps;

    @Column(name = "created_at", nullable = false)
    private LocalDateTime createdAt;
}
