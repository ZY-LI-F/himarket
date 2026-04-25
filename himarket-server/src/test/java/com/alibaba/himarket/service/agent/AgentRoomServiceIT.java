package com.alibaba.himarket.service.agent;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;

import com.alibaba.himarket.core.exception.BusinessException;
import com.alibaba.himarket.dto.result.agent.AgentRoomConfigResult;
import com.alibaba.himarket.dto.result.agent.AgentRoomResult;
import com.alibaba.himarket.dto.result.agent.AgentWorkspaceResult;
import java.util.List;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;

class AgentRoomServiceIT extends AgentServiceITSupport {

    @Autowired private AgentWorkspaceService workspaceService;
    @Autowired private AgentRoomService roomService;
    @Autowired private AgentRoomConfigService roomConfigService;

    @Test
    void createListGetUpdateAndDeleteRoom() {
        AgentWorkspaceResult workspace =
                workspaceService.createWorkspace(USER_ID, createWorkspaceParam("Workspace"));

        AgentRoomResult created =
                roomService.createRoom(USER_ID, workspace.getId(), createRoomParam("Room"));
        List<AgentRoomResult> rooms = roomService.listRooms(USER_ID, workspace.getId());

        assertThat(rooms).extracting(AgentRoomResult::getId).containsExactly(created.getId());
        assertThat(created.getWorkspaceId()).isEqualTo(workspace.getId());
        assertThat(created.getPermission().getAllowedUserIds()).containsExactly(USER_ID);

        AgentRoomConfigResult config = roomConfigService.getRoomConfig(USER_ID, created.getId());
        assertThat(config.getModelId()).isEqualTo("qwen-plus");
        assertThat(config.getSkillBindings()).isEmpty();

        AgentRoomResult updated =
                roomService.updateRoom(USER_ID, created.getId(), updateRoomParam("Room Updated"));
        assertThat(updated.getName()).isEqualTo("Room Updated");
        assertThat(updated.getModelId()).isEqualTo("qwen-max");

        roomService.deleteRoom(USER_ID, created.getId());
        assertThat(roomRepository.findByRoomUid(created.getId()).orElseThrow().getDeletedAt())
                .isNotNull();
        assertThat(roomService.listRooms(USER_ID, workspace.getId())).isEmpty();
    }

    @Test
    void getRoomFailsWhenNotFound() {
        assertThatThrownBy(() -> roomService.getRoom(USER_ID, "missing-room"))
                .isInstanceOfSatisfying(
                        BusinessException.class,
                        error -> assertThat(error.getCode()).isEqualTo("NOT_FOUND"));
    }

    @Test
    void roomUserArgumentMustMatchAuthenticatedPrincipal() {
        AgentWorkspaceResult workspace =
                workspaceService.createWorkspace(USER_ID, createWorkspaceParam("Workspace"));

        assertThatThrownBy(
                        () ->
                                roomService.createRoom(
                                        OTHER_USER_ID,
                                        workspace.getId(),
                                        createRoomParam("Conflict")))
                .isInstanceOfSatisfying(
                        BusinessException.class,
                        error -> assertThat(error.getCode()).isEqualTo("CONFLICT"));
    }
}
