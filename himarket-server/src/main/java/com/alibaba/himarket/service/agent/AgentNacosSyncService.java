package com.alibaba.himarket.service.agent;

public interface AgentNacosSyncService {

    String WORKSPACE_LIST_DATA_ID = "workspace.list";
    String TEAM_TEMPLATE_LIST_DATA_ID = "team-template.list";

    static String roomConfigDataId(String roomId) {
        return "room." + roomId + ".config";
    }

    static String skillBindingDataId(String roomId) {
        return "skill-binding." + roomId;
    }

    void publishWorkspaceList();

    void publishRoomConfig(String roomId);

    void publishTeamTemplateList();

    void publishSkillBinding(String roomId);

    void restoreWorkspace(String userId, String workspaceId);
}
