// The site's one counter of reports (caps.js), a Durable Object: every
// report from anywhere asks this same object, one at a time, so its counts
// are never stale the way KV's can be at each Cloudflare location. It keeps
// only the current hour's counts, as salted hashes of senders, and an alarm
// drops them within two hours.
import { DurableObject } from 'cloudflare:workers'
import { admitCounts, hourOf } from './caps.js'

export class Limits extends DurableObject {
    async admit(sender) {
        const hour = hourOf()
        const { counts, ok, why, file } = admitCounts(await this.ctx.storage.get('counts'), sender, hour)
        if (ok) {
            await this.ctx.storage.put('counts', counts)
            await this.ctx.storage.setAlarm((hour + 2) * 3600000)
        }
        return { ok, why, file }
    }

    async alarm() {
        await this.ctx.storage.deleteAll()
    }
}
