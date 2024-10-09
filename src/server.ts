import {
    CreateTagsCommand,
    DescribeInstancesCommand,
    EC2Client,
    RunInstancesCommand,
    StartInstancesCommand,
    StopInstancesCommand,
    TerminateInstancesCommand,
} from '@aws-sdk/client-ec2'
import inquirer from 'inquirer'

interface InstanceInfo {
    InstanceId: string
    State: string
    InstanceType: string
    LaunchTime: Date | undefined
}

const accessKeyId = process.env.AWS_ACCESS_KEY_ID
const secretAccessKey = process.env.AWS_SECRET_ACCESS_KEY

if (!accessKeyId || !secretAccessKey) {
    throw new Error('AWS credentials are not defined')
}

const client = new EC2Client({
    region: 'us-east-1',
    credentials: {
        accessKeyId,
        secretAccessKey,
    },
})

const startInstance = async (instanceId: string): Promise<void> => {
    const command = new StartInstancesCommand({
        InstanceIds: [instanceId],
    })

    try {
        const data = await client.send(command)
        console.log('Instância iniciada com sucesso:', data.StartingInstances)
    } catch (err) {
        console.error('Erro ao iniciar a instância:', err)
    }
}

const launchNewInstance = async (name: string): Promise<void> => {
    const command = new RunInstancesCommand({
        ImageId: 'ami-0866a3c8686eaeeba', // Ubuntu
        InstanceType: 't2.micro', // T2.micro é elegível para o Free Tier
        MinCount: 1, // Número mínimo de instâncias para lançar
        MaxCount: 1, // Número máximo de instâncias para lançar
        TagSpecifications: [
            {
                ResourceType: 'instance',
                Tags: [
                    {
                        Key: 'Name', // Tag especial para dar nome à instância
                        Value: name, // Nome da instância
                    },
                ],
            },
        ],
    })

    try {
        const data = await client.send(command)
        console.log('Nova instância iniciada com sucesso:', data.Instances)
    } catch (err) {
        console.error('Erro ao lançar a nova instância:', err)
    }
}

const listInstances = async (): Promise<void> => {
    const command = new DescribeInstancesCommand({})

    try {
        const data = await client.send(command)
        const instances: InstanceInfo[] =
            data.Reservations?.flatMap(
                (reservation) =>
                    reservation.Instances?.map((instance) => ({
                        InstanceId: instance.InstanceId as string,
                        State: instance.State?.Name as string,
                        InstanceType: instance.InstanceType as string,
                        LaunchTime: instance.LaunchTime,
                    })) || []
            ) || []
        console.log('Instâncias:', instances)
    } catch (err) {
        console.error('Erro ao listar as instâncias:', err)
    }
}

const updateInstanceTags = async (instanceId: string): Promise<void> => {
    const command = new CreateTagsCommand({
        Resources: [instanceId],
        Tags: [
            {
                Key: 'Environment',
                Value: 'Production',
            },
            {
                Key: 'Department',
                Value: 'Finance',
            },
        ],
    })

    try {
        const data = await client.send(command)
        console.log('Tags atualizadas com sucesso:', data)
    } catch (err) {
        console.error('Erro ao atualizar tags:', err)
    }
}

const listInstanceTags = async (instanceId: string): Promise<void> => {
    const command = new DescribeInstancesCommand({
        InstanceIds: [instanceId], // ID da instância que você deseja verificar
    })

    try {
        const data = await client.send(command)
        const instance = data.Reservations?.[0]?.Instances?.[0]
        if (instance) {
            const tags = instance.Tags
            console.log(`Tags da Instância ${instanceId}:`)
            tags?.forEach((tag) => {
                console.log(`${tag.Key}: ${tag.Value}`)
            })
        } else {
            console.log(`Nenhuma instância encontrada com o ID ${instanceId}`)
        }
    } catch (err) {
        console.error('Erro ao listar as tags da instância:', err)
    }
}

const terminateInstance = async (instanceId: string): Promise<void> => {
    const command = new TerminateInstancesCommand({
        InstanceIds: [instanceId],
    })

    try {
        const data = await client.send(command)
        console.log('Instância terminada com sucesso:', data.TerminatingInstances)
    } catch (err) {
        console.error('Erro ao terminar a instância:', err)
    }
}

const stopInstance = async (instanceId: string): Promise<void> => {
    const command = new StopInstancesCommand({
        InstanceIds: [instanceId],
    })

    try {
        const data = await client.send(command)
        console.log('Instância parada com sucesso:', data.StoppingInstances)
    } catch (err) {
        console.error('Erro ao parar a instância:', err)
    }
}

// Função para exibir o menu
const showMenu = async () => {
    const answers = await inquirer.prompt([
        {
            type: 'list',
            name: 'option',
            message: 'Menu AWS EC2',
            choices: [
                'Listar Instâncias',
                'Criar Instância',
                'Iniciar Instância',
                'Atualizar Tags da Instância',
                'Visualizar Tags da Instância',
                'Parar Instância',
                'Terminar Instância',
                'Sair',
            ],
        },
    ])

    switch (answers.option) {
        case 'Listar Instâncias':
            await listInstances()
            break
        case 'Criar Instância':
            const createAnswer = await inquirer.prompt([
                {
                    type: 'input',
                    name: 'name',
                    message: 'Digite o nome da nova instância:',
                },
            ])
            await launchNewInstance(createAnswer.name)
            break
        case 'Iniciar Instância':
            const startAnswer = await inquirer.prompt([
                {
                    type: 'input',
                    name: 'instanceId',
                    message: 'Digite o ID da instância a ser iniciada:',
                },
            ])
            await startInstance(startAnswer.instanceId)
            break
        case 'Atualizar Tags da Instância':
            const updateAnswer = await inquirer.prompt([
                {
                    type: 'input',
                    name: 'instanceId',
                    message: 'Digite o ID da instância para atualizar as tags:',
                },
            ])
            await updateInstanceTags(updateAnswer.instanceId)
            break
        case 'Visualizar Tags da Instância':
            const listTagsAnswer = await inquirer.prompt([
                {
                    type: 'input',
                    name: 'instanceId',
                    message: 'Digite o ID da instância para visualizar as tags:',
                },
            ])
            await listInstanceTags(listTagsAnswer.instanceId)
            break
        case 'Parar Instância':
            const stopAnswer = await inquirer.prompt([
                {
                    type: 'input',
                    name: 'instanceId',
                    message: 'Digite o ID da instância a ser parada:',
                },
            ])
            await stopInstance(stopAnswer.instanceId)
            break
        case 'Terminar Instância':
            const terminateAnswer = await inquirer.prompt([
                {
                    type: 'input',
                    name: 'instanceId',
                    message: 'Digite o ID da instância a ser terminada:',
                },
            ])
            await terminateInstance(terminateAnswer.instanceId)
            break
        case 'Sair':
            console.log('Saindo...')
            process.exit(0)
        default:
            console.log('Opção inválida')
    }

    // Após a execução de uma ação, volta ao menu principal
    showMenu()
}

// Exibe o menu ao iniciar
showMenu()
