package com.alibaba.himarket.service.agent;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;

import com.alibaba.himarket.core.exception.BusinessException;
import com.alibaba.himarket.dto.result.agent.AgentWorkspacePageResult;
import com.alibaba.himarket.dto.result.agent.AgentWorkspaceResult;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.data.domain.PageRequest;

class AgentWorkspaceServiceIT extends AgentServiceITSupport {

    @Autowired private AgentWorkspaceService workspaceService;

    @Test
    void createListGetUpdateDeleteAndActivateWorkspace() {
        AgentWorkspaceResult first =
                workspaceService.createWorkspace(USER_ID, createWorkspaceParam("Alpha"));
        AgentWorkspaceResult second =
                workspaceService.createWorkspace(USER_ID, createWorkspaceParam("Beta"));

        workspaceService.activateWorkspace(USER_ID, first.getId());
        AgentWorkspaceResult active = workspaceService.activateWorkspace(USER_ID, second.getId());
        AgentWorkspacePageResult page =
                workspaceService.listWorkspaces(USER_ID, PageRequest.of(0, 10));

        assertThat(active.getActive()).isTrue();
        assertThat(page.getTotalElements()).isEqualTo(2L);
        assertThat(workspaceRepository.findByWorkspaceUid(first.getId()).orElseThrow().getActive())
                .isFalse();
        assertThat(workspaceRepository.findByWorkspaceUid(second.getId()).orElseThrow().getActive())
                .isTrue();

        AgentWorkspaceResult updated =
                workspaceService.updateWorkspace(
                        USER_ID, first.getId(), updateWorkspaceParam("Alpha Updated"));
        assertThat(updated.getName()).isEqualTo("Alpha Updated");
        assertThat(workspaceService.getWorkspace(USER_ID, first.getId()).getDescription())
                .isEqualTo("Alpha Updated updated");

        workspaceService.deleteWorkspace(USER_ID, first.getId());
        assertThat(
                        workspaceRepository
                                .findByWorkspaceUid(first.getId())
                                .orElseThrow()
                                .getDeletedAt())
                .isNotNull();
        assertThat(
                        workspaceService
                                .listWorkspaces(USER_ID, PageRequest.of(0, 10))
                                .getTotalElements())
                .isEqualTo(1L);
    }

    @Test
    void getWorkspaceFailsWhenNotFound() {
        assertThatThrownBy(() -> workspaceService.getWorkspace(USER_ID, "missing-workspace"))
                .isInstanceOfSatisfying(
                        BusinessException.class,
                        error -> assertThat(error.getCode()).isEqualTo("NOT_FOUND"));
    }

    @Test
    void workspaceUserArgumentMustMatchAuthenticatedPrincipal() {
        assertThatThrownBy(
                        () ->
                                workspaceService.createWorkspace(
                                        OTHER_USER_ID, createWorkspaceParam("Conflict")))
                .isInstanceOfSatisfying(
                        BusinessException.class,
                        error -> assertThat(error.getCode()).isEqualTo("CONFLICT"));
    }
}
