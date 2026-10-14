pipeline {
    agent any

    environment {
        // REPLACE with your actual Docker Hub username (e.g., 'johndoe')
        DOCKER_HUB_USER = 'pushkar156'
        IMAGE_NAME      = "${DOCKER_HUB_USER}/devops-portal"
        APP_NAME        = "devops-portal"
        KUBECONFIG      = "/var/lib/jenkins/.kube/config"
    }

    stages {
        stage('Checkout SCM') {
            steps {
                echo '=== Stage 1 & 2: Checking out latest code from repository ==='
                checkout scm
            }
        }

        stage('Build and Test') {
            steps {
                echo '=== Stage 3: Running Automated Build & Syntax Lint Validation ==='
                sh 'chmod +x test/validate.sh'
                sh 'bash test/validate.sh'
            }
        }

        stage('Docker Build') {
            steps {
                echo "=== Stage 4: Building Docker Image for Build #${BUILD_NUMBER} ==="
                sh "docker build -t ${IMAGE_NAME}:${BUILD_NUMBER} -t ${IMAGE_NAME}:latest ."
            }
        }

        stage('Push Image') {
            steps {
                echo "=== Stage 5: Authenticating and Publishing to Docker Hub ==="
                withCredentials([usernamePassword(credentialsId: 'dockerhub-credentials', 
                                                 usernameVariable: 'DOCKER_USER', 
                                                 passwordVariable: 'DOCKER_PASS')]) {
                    sh 'echo "$DOCKER_PASS" | docker login -u "$DOCKER_USER" --password-stdin'
                    sh "docker push ${IMAGE_NAME}:${BUILD_NUMBER}"
                    sh "docker push ${IMAGE_NAME}:latest"
                }
            }
        }

        stage('Minikube Deployment') {
            steps {
                echo "=== Stage 6: Deploying to Minikube Kubernetes Cluster ==="
                script {
                    // Update the image tag dynamically in the deployment manifest
                    sh "sed -i 's|IMAGE_PLACEHOLDER|${IMAGE_NAME}:${BUILD_NUMBER}|g' k8s/deployment.yaml"
                    
                    // Apply manifests
                    sh "kubectl apply -f k8s/deployment.yaml"
                    sh "kubectl apply -f k8s/service.yaml"
                }
            }
        }

        stage('Verification') {
            steps {
                echo '=== Stage 7: Verifying Pods, Deployment and Service Health ==='
                // Wait for the rolling update to complete successfully
                sh "kubectl rollout status deployment/${APP_NAME} --timeout=90s"
                
                echo 'Active Deployments:'
                sh "kubectl get deployments -l app=${APP_NAME}"
                
                echo 'Active Pods:'
                sh "kubectl get pods -l app=${APP_NAME} -o wide"
                
                echo 'Active Services:'
                sh "kubectl get svc devops-portal-service"

                echo "=========================================================="
                echo "Application successfully deployed and verified!"
                echo "Access URL: http://<EC2-PUBLIC-IP>:30080"
                echo "=========================================================="
            }
        }
    }

    post {
        always {
            echo '=== Pipeline Execution Completed ==='
        }
        success {
            echo "Build #${BUILD_NUMBER} Deployed Successfully! 🎉"
        }
        failure {
            echo "Pipeline Failed! Check console log for details."
        }
    }
}
