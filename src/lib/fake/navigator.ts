export class Navigator {
    platform: string;
    userAgent: string;

    constructor(platform: string, userAgent: string) {
        this.platform = platform;
        this.userAgent = userAgent;
    }
}
