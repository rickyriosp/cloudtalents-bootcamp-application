HOMEDIR=/home/ec2-user
yum update -y
yum install net-tools -y
yum install wget -y
sudo yum install -y https://s3.amazonaws.com/ec2-downloads-windows/SSMAgent/latest/linux_amd64/amazon-ssm-agent.rpm
sudo systemctl start amazon-ssm-agent

TOKEN=`curl -X PUT "http://169.254.169.254/latest/api/token" -H "X-aws-ec2-metadata-token-ttl-seconds: 21600"`
LOCAL_HOSTNAME=$( curl -H "X-aws-ec2-metadata-token: $TOKEN" -v http://169.254.169.254/latest/meta-data/public-hostname )
INSTANCE_ID=$( curl -H "X-aws-ec2-metadata-token: $TOKEN" -v http://169.254.169.254/latest/meta-data/instance-id )

sudo echo "AMI Hostname: $LOCAL_HOSTNAME" >> /home/ec2-user/config.txt
sudo echo "AMI InstanceId: $INSTANCE_ID" >> /home/ec2-user/config.txt

#mkdir -p /opt/app && cd /opt/app
#git clone https://github.com/rickyriosp/cloudtalents-bootcamp-application.git

sudo echo "user script completed" >> /home/ec2-user/completed.txt