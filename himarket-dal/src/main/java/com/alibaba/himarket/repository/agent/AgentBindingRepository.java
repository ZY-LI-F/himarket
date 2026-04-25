package com.alibaba.himarket.repository.agent;

import com.alibaba.himarket.entity.agent.AgentBindingEntity;
import java.util.List;
import java.util.Optional;
import org.springframework.data.jpa.repository.JpaRepository;

public interface AgentBindingRepository extends JpaRepository<AgentBindingEntity, Long> {

    Optional<AgentBindingEntity> findByBindingUid(String bindingUid);

    Optional<AgentBindingEntity> findByBindingUidAndDeletedAtIsNull(String bindingUid);

    List<AgentBindingEntity> findByRoomUidAndStatusAndDeletedAtIsNullOrderByCreatedAtAsc(
            String roomUid, String status);
}
