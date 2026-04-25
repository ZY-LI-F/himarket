package com.alibaba.himarket.entity.agent;

import static org.assertj.core.api.Assertions.assertThat;

import com.alibaba.himarket.repository.agent.AgentBindingRepository;
import com.alibaba.himarket.repository.agent.AgentRoomConfigRepository;
import com.alibaba.himarket.repository.agent.AgentRoomRepository;
import com.alibaba.himarket.repository.agent.AgentTaskRunRepository;
import com.alibaba.himarket.repository.agent.AgentTeamTemplateRepository;
import com.alibaba.himarket.repository.agent.AgentWorkspaceRepository;
import java.time.LocalDateTime;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.SpringBootConfiguration;
import org.springframework.boot.autoconfigure.EnableAutoConfiguration;
import org.springframework.boot.autoconfigure.domain.EntityScan;
import org.springframework.boot.test.autoconfigure.jdbc.AutoConfigureTestDatabase;
import org.springframework.boot.test.autoconfigure.orm.jpa.DataJpaTest;
import org.springframework.boot.test.autoconfigure.orm.jpa.TestEntityManager;
import org.springframework.context.annotation.ComponentScan;
import org.springframework.data.jpa.repository.config.EnableJpaRepositories;
import org.springframework.test.context.ContextConfiguration;
import org.springframework.test.context.TestPropertySource;

@DataJpaTest
@ContextConfiguration(classes = AgentEntityMappingTest.JpaTestApplication.class)
@AutoConfigureTestDatabase(replace = AutoConfigureTestDatabase.Replace.NONE)
@TestPropertySource(
        properties = {
            "spring.datasource.url=jdbc:h2:mem:agent_mapping;MODE=MySQL;DATABASE_TO_LOWER=TRUE;CASE_INSENSITIVE_IDENTIFIERS=TRUE",
            "spring.datasource.driver-class-name=org.h2.Driver",
            "spring.datasource.username=sa",
            "spring.datasource.password=",
            "spring.jpa.hibernate.ddl-auto=create-drop",
            "spring.flyway.enabled=false"
        })
class AgentEntityMappingTest {

    private static final LocalDateTime NOW = LocalDateTime.of(2026, 4, 25, 12, 0);

    @Autowired private AgentWorkspaceRepository workspaceRepository;
    @Autowired private AgentRoomRepository roomRepository;
    @Autowired private AgentRoomConfigRepository roomConfigRepository;
    @Autowired private AgentBindingRepository bindingRepository;
    @Autowired private AgentTaskRunRepository taskRunRepository;
    @Autowired private AgentTeamTemplateRepository teamTemplateRepository;
    @Autowired private TestEntityManager entityManager;

    @Test
    void persistsAndReadsAgentEntities() {
        verifyWorkspaceRoundTrip();
        verifyRoomRoundTrip();
        verifyRoomConfigRoundTrip();
        verifyBindingRoundTrip();
        verifyTaskRunRoundTrip();
        verifyTeamTemplateRoundTrip();
    }

    private void verifyWorkspaceRoundTrip() {
        workspaceRepository.saveAndFlush(workspace());
        entityManager.clear();

        AgentWorkspaceEntity found =
                workspaceRepository.findByWorkspaceUid("workspace-1").orElseThrow();
        assertThat(found.getTenantId()).isEqualTo("tenant-1");
        assertThat(found.getActive()).isTrue();
    }

    private void verifyRoomRoundTrip() {
        roomRepository.saveAndFlush(room());
        entityManager.clear();

        AgentRoomEntity found = roomRepository.findByRoomUid("room-1").orElseThrow();
        assertThat(found.getWorkspaceUid()).isEqualTo("workspace-1");
        assertThat(found.getPermissionJson()).isEqualTo("{\"read\":true}");
    }

    private void verifyRoomConfigRoundTrip() {
        roomConfigRepository.saveAndFlush(roomConfig());
        entityManager.clear();

        AgentRoomConfigEntity found = roomConfigRepository.findByRoomUid("room-1").orElseThrow();
        assertThat(found.getConfigJson()).isEqualTo("{\"temperature\":0.2}");
        assertThat(found.getVersion()).isEqualTo(1L);
    }

    private void verifyBindingRoundTrip() {
        bindingRepository.saveAndFlush(binding());
        entityManager.clear();

        AgentBindingEntity found = bindingRepository.findByBindingUid("binding-1").orElseThrow();
        assertThat(found.getKind()).isEqualTo("SKILL");
        assertThat(found.getStatus()).isEqualTo("ACTIVE");
    }

    private void verifyTaskRunRoundTrip() {
        taskRunRepository.saveAndFlush(taskRun());
        entityManager.clear();

        AgentTaskRunEntity found = taskRunRepository.findByTaskUid("task-1").orElseThrow();
        assertThat(found.getStatus()).isEqualTo("SUCCEEDED");
        assertThat(found.getArtifactsJson()).isEqualTo("[]");
    }

    private void verifyTeamTemplateRoundTrip() {
        teamTemplateRepository.saveAndFlush(teamTemplate());
        entityManager.clear();

        AgentTeamTemplateEntity found =
                teamTemplateRepository.findByTemplateId("template-1").orElseThrow();
        assertThat(found.getName()).isEqualTo("Dev Team");
        assertThat(found.getDefaultSkills()).isEqualTo("[]");
    }

    private AgentWorkspaceEntity workspace() {
        return AgentWorkspaceEntity.builder()
                .workspaceUid("workspace-1")
                .tenantId("tenant-1")
                .ownerId("owner-1")
                .name("Workspace")
                .description("Agent workspace")
                .defaultTeamTemplateId("template-1")
                .active(true)
                .createdAt(NOW)
                .updatedAt(NOW)
                .build();
    }

    private AgentRoomEntity room() {
        return AgentRoomEntity.builder()
                .roomUid("room-1")
                .workspaceUid("workspace-1")
                .tenantId("tenant-1")
                .name("Room")
                .modelId("model-1")
                .teamTemplateId("template-1")
                .fileRoot("/workspace")
                .permissionJson("{\"read\":true}")
                .createdAt(NOW)
                .updatedAt(NOW)
                .build();
    }

    private AgentRoomConfigEntity roomConfig() {
        return AgentRoomConfigEntity.builder()
                .roomUid("room-1")
                .configJson("{\"temperature\":0.2}")
                .version(1L)
                .updatedAt(NOW)
                .build();
    }

    private AgentBindingEntity binding() {
        return AgentBindingEntity.builder()
                .bindingUid("binding-1")
                .roomUid("room-1")
                .kind("SKILL")
                .productId("product-1")
                .version("1.0.0")
                .status("ACTIVE")
                .createdAt(NOW)
                .build();
    }

    private AgentTaskRunEntity taskRun() {
        return AgentTaskRunEntity.builder()
                .taskUid("task-1")
                .roomUid("room-1")
                .tenantId("tenant-1")
                .status("SUCCEEDED")
                .prompt("Build feature")
                .planJson("[]")
                .eventsJson("[]")
                .artifactsJson("[]")
                .createdAt(NOW)
                .completedAt(NOW)
                .build();
    }

    private AgentTeamTemplateEntity teamTemplate() {
        return AgentTeamTemplateEntity.builder()
                .templateId("template-1")
                .name("Dev Team")
                .version("1.0.0")
                .managerProfileJson("{\"role\":\"manager\"}")
                .workersProfileJson("[{\"role\":\"coder\"}]")
                .defaultSkills("[]")
                .defaultMcps("[]")
                .createdAt(NOW)
                .build();
    }

    @SpringBootConfiguration
    @EnableAutoConfiguration
    @EntityScan("com.alibaba.himarket.entity.agent")
    @EnableJpaRepositories("com.alibaba.himarket.repository.agent")
    @ComponentScan("com.alibaba.himarket.repository.agent")
    static class JpaTestApplication {}
}
