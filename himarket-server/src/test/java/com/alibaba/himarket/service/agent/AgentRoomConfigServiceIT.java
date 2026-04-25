package com.alibaba.himarket.service.agent;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;

import com.alibaba.himarket.core.exception.BusinessException;
import com.alibaba.himarket.dto.params.agent.UpdateRoomConfigParam;
import com.alibaba.himarket.dto.result.agent.AgentRoomConfigResult;
import com.alibaba.himarket.dto.result.agent.AgentRoomResult;
import com.alibaba.himarket.dto.result.agent.AgentWorkspaceResult;
import com.alibaba.himarket.entity.agent.AgentRoomConfigEntity;
import java.time.LocalDateTime;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.dao.OptimisticLockingFailureException;

class AgentRoomConfigServiceIT extends AgentServiceITSupport {

    @Autowired private AgentWorkspaceService workspaceService;
    @Autowired private AgentRoomService roomService;
    @Autowired private AgentRoomConfigService roomConfigService;

    @Test
    void getAndUpdateRoomConfigStoredAsJson() {
        AgentRoomResult room = createRoom();

        AgentRoomConfigResult initial = roomConfigService.getRoomConfig(USER_ID, room.getId());
        assertThat(initial.getRoomId()).isEqualTo(room.getId());
        assertThat(initial.getMcpBindings()).isEmpty();

        AgentRoomConfigResult updated =
                roomConfigService.updateRoomConfig(
                        USER_ID, room.getId(), roomConfigParam(room.getId(), "qwen-max"));

        AgentRoomConfigEntity stored =
                roomConfigRepository.findByRoomUid(room.getId()).orElseThrow();
        assertThat(updated.getModelId()).isEqualTo("qwen-max");
        assertThat(updated.getSkillBindings()).hasSize(1);
        assertThat(stored.getConfigJson()).contains("\"modelId\":\"qwen-max\"");
        assertThat(roomRepository.findByRoomUid(room.getId()).orElseThrow().getModelId())
                .isEqualTo("qwen-max");
    }

    @Test
    void getRoomConfigFailsWhenRoomNotFound() {
        assertThatThrownBy(() -> roomConfigService.getRoomConfig(USER_ID, "missing-room"))
                .isInstanceOfSatisfying(
                        BusinessException.class,
                        error -> assertThat(error.getCode()).isEqualTo("NOT_FOUND"));
    }

    @Test
    void updateRoomConfigRejectsConflictingRoomId() {
        AgentRoomResult room = createRoom();
        UpdateRoomConfigParam param = roomConfigParam("different-room", "qwen-max");

        assertThatThrownBy(() -> roomConfigService.updateRoomConfig(USER_ID, room.getId(), param))
                .isInstanceOfSatisfying(
                        BusinessException.class,
                        error -> assertThat(error.getCode()).isEqualTo("CONFLICT"));
    }

    @Test
    void staleRoomConfigVersionFailsOptimisticLocking() {
        AgentRoomResult room = createRoom();
        AgentRoomConfigEntity stale =
                roomConfigRepository.findByRoomUid(room.getId()).orElseThrow();

        roomConfigService.updateRoomConfig(
                USER_ID, room.getId(), roomConfigParam(room.getId(), "qwen-max"));
        stale.setConfigJson(stale.getConfigJson().replace("qwen-plus", "qwen-turbo"));
        stale.setUpdatedAt(LocalDateTime.now());

        assertThatThrownBy(() -> roomConfigRepository.saveAndFlush(stale))
                .isInstanceOf(OptimisticLockingFailureException.class);
    }

    private AgentRoomResult createRoom() {
        AgentWorkspaceResult workspace =
                workspaceService.createWorkspace(USER_ID, createWorkspaceParam("Workspace"));
        return roomService.createRoom(USER_ID, workspace.getId(), createRoomParam("Room"));
    }
}
