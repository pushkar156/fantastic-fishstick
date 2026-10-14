// CloudOps Hub Interactive Logic
document.addEventListener("DOMContentLoaded", () => {
  // Pipeline stage definitions
  const stages = {
    1: {
      title: "Stage 1: Source Code Checkout",
      desc: "Jenkins pulls the latest commit from the GitHub repository using Git SCM credentials.",
      snippet: `stage('Checkout SCM') {
    steps {
        echo 'Checking out latest code from GitHub...'
        checkout scm
    }
}`
    },
    2: {
      title: "Stage 2: Code Validation & Lint Test",
      desc: "Automated syntax and integrity test verifying HTML/CSS/JS file validity and folder structure before containerization.",
      snippet: `stage('Build and Test') {
    steps {
        echo 'Running automated syntax and structure test...'
        sh 'bash test/validate.sh'
    }
}`
    },
    3: {
      title: "Stage 3: Docker Image Build",
      desc: "Docker engine packages the static web application inside an Nginx Alpine container, tagging it with Jenkins BUILD_NUMBER.",
      snippet: `stage('Docker Build') {
    steps {
        echo "Building Docker image: \${IMAGE_NAME}:\${BUILD_NUMBER}..."
        sh "docker build -t \${IMAGE_NAME}:\${BUILD_NUMBER} -t \${IMAGE_NAME}:latest ."
    }
}`
    },
    4: {
      title: "Stage 4: Push to Container Registry",
      desc: "Securely logs into Docker Hub using stored Jenkins credentials and publishes both versioned and latest tags.",
      snippet: `stage('Push Image') {
    steps {
        withCredentials([usernamePassword(credentialsId: 'dockerhub-credentials', 
                         usernameVariable: 'DOCKER_USER', 
                         passwordVariable: 'DOCKER_PASS')]) {
            sh "echo \$DOCKER_PASS | docker login -u \$DOCKER_USER --password-stdin"
            sh "docker push \${IMAGE_NAME}:\${BUILD_NUMBER}"
            sh "docker push \${IMAGE_NAME}:latest"
        }
    }
}`
    },
    5: {
      title: "Stage 5: Deploy to Minikube Kubernetes",
      desc: "Applies Kubernetes manifests and triggers a rolling update replacing old pods with the newly built Docker image.",
      snippet: `stage('Minikube Deployment') {
    steps {
        echo "Updating deployment manifest with image \${IMAGE_NAME}:\${BUILD_NUMBER}..."
        sh "sed -i 's|IMAGE_PLACEHOLDER|\${IMAGE_NAME}:\${BUILD_NUMBER}|g' k8s/deployment.yaml"
        sh "kubectl apply -f k8s/"
    }
}`
    },
    6: {
      title: "Stage 6: Rollout Verification & Health Check",
      desc: "Checks that all replicas transitioned cleanly, pods are Healthy, and prints the NodePort service endpoint.",
      snippet: `stage('Verification') {
    steps {
        echo 'Waiting for rolling update to finish...'
        sh "kubectl rollout status deployment/devops-portal --timeout=90s"
        sh "kubectl get pods,svc -l app=devops-portal"
    }
}`
    }
  };

  const stepButtons = document.querySelectorAll(".step-btn");
  const stageTitle = document.getElementById("stageTitle");
  const stageDesc = document.getElementById("stageDesc");
  const stageSnippet = document.getElementById("stageSnippet");

  stepButtons.forEach((btn) => {
    btn.addEventListener("click", () => {
      // Remove active class from all
      stepButtons.forEach((b) => b.classList.remove("active"));
      btn.classList.add("active");

      const stepNum = btn.getAttribute("data-step");
      const stage = stages[stepNum];

      if (stage) {
        stageTitle.textContent = stage.title;
        stageDesc.textContent = stage.desc;
        stageSnippet.innerHTML = `<code>${escapeHtml(stage.snippet)}</code>`;
      }
    });
  });

  function escapeHtml(str) {
    return str
      .replace(/&/g, "&amp;")
      .replace(/</g, "&lt;")
      .replace(/>/g, "&gt;")
      .replace(/"/g, "&quot;")
      .replace(/'/g, "&#039;");
  }

  console.log("CloudOps Hub application loaded successfully - v1.0.0");
});
