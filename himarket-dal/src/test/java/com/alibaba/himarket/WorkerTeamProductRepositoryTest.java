package com.alibaba.himarket;

import static org.assertj.core.api.Assertions.assertThat;

import com.alibaba.himarket.entity.WorkerTeamProductEntity;
import com.alibaba.himarket.entity.WorkerTeamProductMemberEntity;
import com.alibaba.himarket.repository.WorkerTeamProductRepository;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.SpringBootConfiguration;
import org.springframework.boot.autoconfigure.EnableAutoConfiguration;
import org.springframework.boot.autoconfigure.domain.EntityScan;
import org.springframework.boot.test.autoconfigure.jdbc.AutoConfigureTestDatabase;
import org.springframework.boot.test.autoconfigure.orm.jpa.DataJpaTest;
import org.springframework.boot.test.autoconfigure.orm.jpa.TestEntityManager;
import org.springframework.context.annotation.ComponentScan;
import org.springframework.data.jpa.repository.config.EnableJpaAuditing;
import org.springframework.data.jpa.repository.config.EnableJpaRepositories;
import org.springframework.test.context.ContextConfiguration;
import org.springframework.test.context.TestPropertySource;

@DataJpaTest
@ContextConfiguration(classes = WorkerTeamProductRepositoryTest.JpaTestApplication.class)
@AutoConfigureTestDatabase(replace = AutoConfigureTestDatabase.Replace.NONE)
@TestPropertySource(
        properties = {
            "spring.datasource.url=jdbc:h2:mem:worker_team_product;MODE=MySQL;DATABASE_TO_LOWER=TRUE;CASE_INSENSITIVE_IDENTIFIERS=TRUE",
            "spring.datasource.driver-class-name=org.h2.Driver",
            "spring.datasource.username=sa",
            "spring.datasource.password=",
            "spring.jpa.hibernate.ddl-auto=create-drop",
            "spring.flyway.enabled=false"
        })
class WorkerTeamProductRepositoryTest {

    @Autowired private WorkerTeamProductRepository repository;

    @Autowired private TestEntityManager entityManager;

    @Test
    void persistsWorkerTeamProductWithMembers() {
        WorkerTeamProductEntity entity =
                WorkerTeamProductEntity.builder()
                        .productId("team-product-1")
                        .name("Support Team")
                        .version("1.0.0")
                        .businessDomain("support")
                        .description("Handles customer support workflows")
                        .status("online")
                        .visibility("public")
                        .pricing("{\"plan\":\"free\"}")
                        .tagsJson("[\"support\",\"ai\"]")
                        .build();
        entity.replaceMembers(
                java.util.List.of(
                        member("team-product-1", 1, "leader", "triage-worker", "1.0.0"),
                        member("team-product-1", 2, "member", "answer-worker", "1.0.0")));

        repository.saveAndFlush(entity);
        entityManager.clear();

        WorkerTeamProductEntity found = repository.findById("team-product-1").orElseThrow();
        assertThat(found.getName()).isEqualTo("Support Team");
        assertThat(found.getPricing()).contains("plan");
        assertThat(found.getMembers()).hasSize(2);
        assertThat(found.getMembers().get(0).getRole()).isEqualTo("leader");
        assertThat(found.getMembers().get(1).getRefName()).isEqualTo("answer-worker");
    }

    private WorkerTeamProductMemberEntity member(
            String productId, int ordinal, String role, String refName, String refVersion) {
        return WorkerTeamProductMemberEntity.builder()
                .productId(productId)
                .ordinal(ordinal)
                .role(role)
                .refName(refName)
                .refVersion(refVersion)
                .build();
    }

    @SpringBootConfiguration
    @EnableAutoConfiguration
    @EnableJpaAuditing
    @EntityScan("com.alibaba.himarket.entity")
    @EnableJpaRepositories("com.alibaba.himarket.repository")
    @ComponentScan("com.alibaba.himarket.repository")
    static class JpaTestApplication {}
}
