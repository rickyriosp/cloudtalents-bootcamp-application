HOMEDIR=/home/ubuntu
AWS_DIR="/opt/aws/bin"

#################################################################################################
# Update Ubuntu's package list and install the following dependencies:
# - build-essential
# - python3-pip
# 
# Relevant link: https://ubuntu.com/server/docs/package-management
#################################################################################################
sudo apt-get update -y
sudo apt-get upgrade -y
sudo apt-get install build-essential -y
sudo apt-get install python3-pip -y

#################################################################################################
# Install AWS CloudFormation helper scripts
#
# Relevant link: https://docs.aws.amazon.com/AWSCloudFormation/latest/UserGuide/cfn-helper-scripts-reference.html
#################################################################################################
sudo mkdir -p $AWS_DIR
sudo pip3 install https://s3.amazonaws.com/cloudformation-examples/aws-cfn-bootstrap-py3-latest.tar.gz --break-system-packages
sudo ln -s /usr/local/init/ubuntu/cfn-hup /etc/init.d/cfn-hup
sudo ln -s /usr/local/bin/cfn-* $AWS_DIR


TOKEN=`curl -X PUT "http://169.254.169.254/latest/api/token" -H "X-aws-ec2-metadata-token-ttl-seconds: 21600"`
LOCAL_HOSTNAME=$( curl -H "X-aws-ec2-metadata-token: $TOKEN" -v http://169.254.169.254/latest/meta-data/public-hostname )
INSTANCE_ID=$( curl -H "X-aws-ec2-metadata-token: $TOKEN" -v http://169.254.169.254/latest/meta-data/instance-id )

sudo echo "AMI Hostname: $LOCAL_HOSTNAME" >> /home/ubuntu/config.txt
sudo echo "AMI InstanceId: $INSTANCE_ID" >> /home/ubuntu/config.txt

sudo echo "user script completed" >> /home/ubuntu/completed.txt