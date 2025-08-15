import { Client, ConsumerFilter } from "./client"
import { Consumer, ConsumerFunc, ConsumerUpdateListener } from "./consumer"
import { ConsumerCreditPolicy, defaultCreditPolicy } from "./consumer_credit_policy"
import { Offset } from "./requests/subscribe_request"

export class SuperStreamConsumer {
  private consumers: Map<string, Consumer> = new Map<string, Consumer>()
  public consumerRef: string
  readonly superStream: string
  private locator: Client
  private partitions: string[]
  private offset: Offset
  private creditPolicy: ConsumerCreditPolicy
  private consumerUpdateListener: ConsumerUpdateListener | undefined
  private filter: ConsumerFilter | undefined

  private constructor(
    readonly handle: ConsumerFunc,
    params: {
      superStream: string
      locator: Client
      partitions: string[]
      consumerRef: string
      offset: Offset
      creditPolicy?: ConsumerCreditPolicy
      consumerUpdateListener?: ConsumerUpdateListener
      filter?: ConsumerFilter
    }
  ) {
    this.superStream = params.superStream
    this.consumerRef = params.consumerRef
    this.locator = params.locator
    this.partitions = params.partitions
    this.offset = params.offset
    this.consumerUpdateListener = params.consumerUpdateListener
    this.creditPolicy = params.creditPolicy || defaultCreditPolicy
    this.filter = params.filter
  }

  async start(): Promise<void> {
    await Promise.all(
      this.partitions.map(async (p) => {
        const partitionConsumer = await this.locator.declareConsumer(
          {
            stream: p,
            consumerRef: this.consumerRef,
            offset: this.offset,
            filter: this.filter,
            singleActive: true,
            consumerUpdateListener: this.consumerUpdateListener,
            creditPolicy: this.creditPolicy,
          },
          this.handle,
          this
        )
        this.consumers.set(p, partitionConsumer)
        return
      })
    )
  }

  static async create(
    handle: ConsumerFunc,
    params: {
      superStream: string
      locator: Client
      partitions: string[]
      consumerRef: string
      offset: Offset
      creditPolicy?: ConsumerCreditPolicy
      consumerUpdateListener?: ConsumerUpdateListener
      filter?: ConsumerFilter
    }
  ): Promise<SuperStreamConsumer> {
    console.log("Creating SuperStreamConsumer for super stream")
    const superStreamConsumer = new SuperStreamConsumer(handle, params)
    await superStreamConsumer.start()
    return superStreamConsumer
  }

  async close(): Promise<void> {
    await Promise.all([...this.consumers.values()].map((c) => c.close()))
  }
}
