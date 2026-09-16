
pipeline {
    agent any

    environment {
        AWS_REGION = 'eu-north-1'
        AWS_ACCOUNT_ID = '472864302807'
        ECR_REGISTRY = "${AWS_ACCOUNT_ID}.dkr.ecr.${AWS_REGION}.amazonaws.com"

        BACKEND_REPO = 'two-tier-backend'
        FRONTEND_REPO = 'two-tier-frontend'

        GITOPS_REPO = 'https://github.com/gauravrajlaxmi/first_task_io_gitops.git'
        GITOPS_BRANCH = 'main'
        GITOPS_CREDENTIALS = 'github-gitops'
    }

    stages {

        stage('Checkout Application') {
            steps {
                checkout scm
            }
        }

        stage('Generate Image Tag') {
            steps {
                script {
                    def shortCommit = sh(
                        script: 'git rev-parse --short=7 HEAD',
                        returnStdout: true
                    ).trim()

                    env.IMAGE_TAG = "build-${BUILD_NUMBER}-${shortCommit}"

                    echo "Image tag: ${env.IMAGE_TAG}"
                }
            }
        }

        stage('Test Backend') {
            steps {
                dir('backend') {
                    sh '''
                        set -e
                        npm ci
                        node --check server.js
                    '''
                }
            }
        }

        stage('Test Frontend') {
            steps {
                dir('frontend') {
                    sh '''
                        set -e
                        npm ci
                        npm run build
                    '''
                }
            }
        }

        stage('Build Docker Images') {
            steps {
                sh '''
                    set -e

                    docker build \
                        -t ${ECR_REGISTRY}/${BACKEND_REPO}:${IMAGE_TAG} \
                        ./backend

                    docker build \
                        -t ${ECR_REGISTRY}/${FRONTEND_REPO}:${IMAGE_TAG} \
                        ./frontend
                '''
            }
        }

        stage('Login to ECR') {
            steps {
                sh '''
                    set -e

                    aws ecr get-login-password \
                        --region ${AWS_REGION} | \
                    docker login \
                        --username AWS \
                        --password-stdin ${ECR_REGISTRY}
                '''
            }
        }

        stage('Push Images to ECR') {
            steps {
                sh '''
                    set -e

                    docker push \
                        ${ECR_REGISTRY}/${BACKEND_REPO}:${IMAGE_TAG}

                    docker push \
                        ${ECR_REGISTRY}/${FRONTEND_REPO}:${IMAGE_TAG}
                '''
            }
        }

        stage('Update GitOps Repository') {
            steps {
                dir('gitops') {

                    checkout([
                        $class: 'GitSCM',
                        branches: [[name: "*/${GITOPS_BRANCH}"]],
                        userRemoteConfigs: [[
                            credentialsId: "${GITOPS_CREDENTIALS}",
                            url: "${GITOPS_REPO}"
                        ]]
                    ])

                    sh '''
                        set -e

                        echo "Updating backend image..."

                        sed -i \
                            "s#image: .*two-tier-backend:.*#image: ${ECR_REGISTRY}/${BACKEND_REPO}:${IMAGE_TAG}#" \
                            backend/deployment.yaml

                        echo "Updating frontend image..."

                        sed -i \
                            "s#image: .*two-tier-frontend:.*#image: ${ECR_REGISTRY}/${FRONTEND_REPO}:${IMAGE_TAG}#" \
                            frontend/deployment.yaml

                        echo "Updated image references:"

                        grep "image:" backend/deployment.yaml
                        grep "image:" frontend/deployment.yaml

                        git config user.name "Jenkins"
                        git config user.email "jenkins@localhost"

                        git add backend/deployment.yaml frontend/deployment.yaml

                        if git diff --cached --quiet; then
                            echo "No changes to commit."
                        else
                            git commit -m "Deploy ${IMAGE_TAG}"

                            echo "Pushing changes to GitOps repository..."

                            git push origin HEAD:${GITOPS_BRANCH}
                        fi
                    '''
                }
            }
        }
    }

    post {

        success {
            echo """
==========================================
CI PIPELINE SUCCESS
==========================================

Image tag:
${IMAGE_TAG}

Backend:
${ECR_REGISTRY}/${BACKEND_REPO}:${IMAGE_TAG}

Frontend:
${ECR_REGISTRY}/${FRONTEND_REPO}:${IMAGE_TAG}

GitOps repository updated.

Argo CD will automatically deploy this version.

==========================================
"""
        }

        failure {
            echo "Pipeline failed. Check the stage logs above."
        }

        always {
            sh '''
                docker image prune -f || true
            '''
        }
    }
}


