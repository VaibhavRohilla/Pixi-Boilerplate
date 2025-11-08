import { Container, Sprite, Texture, TextStyle, Rectangle, Graphics } from "pixi.js";
import { Tween, Group, Easing } from "tweedle.js";
import { Globals } from "./globals";
import { TextLabel } from "./textlabel";

type ButtonState = "normal" | "hover" | "down" | "disabled";

export interface ButtonTextures {
	normal: Texture;
	hover?: Texture;
	down?: Texture;
	disabled?: Texture;
}

export interface ButtonAnimationConfig {
	hoverScale?: number;
	downScale?: number;
	disabledAlpha?: number;
	durationMs?: number;
}

export interface ButtonOptions {
	textures: ButtonTextures;
	labelText?: string;
	labelStyle?: TextStyle;
	anchor?: number;
	hitAreaPadding?: number;
	animations?: ButtonAnimationConfig;
	/** If true, only callbacks are invoked; no global emits are fired */
	callbacksOnly?: boolean;
	onClick?: () => void;
	onDown?: () => void;
	onUp?: () => void;
	onOver?: () => void;
	onOut?: () => void;
}

const DefaultAnim: Required<ButtonAnimationConfig> = {
	hoverScale: 1.06,
	downScale: 0.96,
	disabledAlpha: 0.5,
	durationMs: 120,
};

export class UIButton extends Container {
	private sprite: Sprite;
	private titleLabel?: TextLabel;
	private state: ButtonState = "normal";
	private textures: ButtonTextures;
	private anim: Required<ButtonAnimationConfig>;
	private currentTween: Tween<any> | undefined;
	private baseScale:number = 1;
	private callbacksOnly: boolean;

	constructor(options: ButtonOptions) {
		super();

		this.textures = options.textures;
		this.anim = { ...DefaultAnim, ...(options.animations ?? {}) };
		this.callbacksOnly = !!options.callbacksOnly;

		this.sprite = new Sprite(this.textures.normal);
		this.sprite.anchor.set(options.anchor ?? 0.5);
		this.addChild(this.sprite);

		if (options.labelText) {
			this.titleLabel = new TextLabel(0, 0, 0.5, options.labelText, 20, 0xffffff, "Arial");
			this.addChild(this.titleLabel);
		}

		if (options.hitAreaPadding) {
			const b = this.sprite.getLocalBounds();
			const pad = options.hitAreaPadding;
			this.hitArea = new Rectangle(b.x - pad, b.y - pad, b.width + pad * 2, b.height + pad * 2);
		}

		this.eventMode = "static";
		this.cursor = "pointer";

		this.on("pointerover", () => {
			if (this.state === "disabled") return;
			this.setState("hover");
			options.onOver?.();
			if (!this.callbacksOnly) Globals.emitter?.Call("over");
		});
		this.on("pointerout", () => {
			if (this.state === "disabled") return;
			this.setState("normal");
			options.onOut?.();
			if (!this.callbacksOnly) Globals.emitter?.Call("out");
		});
		this.on("pointerdown", () => {
			if (this.state === "disabled") return;
			this.setState("down");
			options.onDown?.();
			if (!this.callbacksOnly) Globals.emitter?.Call("down");
		});
		this.on("pointerup", () => {
			if (this.state === "disabled") return;
			this.setState("hover");
			options.onUp?.();
			if (!this.callbacksOnly) Globals.emitter?.Call("up");
		});
		this.on("pointerupoutside", () => {
			if (this.state === "disabled") return;
			this.setState("normal");
			options.onUp?.();
			if (!this.callbacksOnly) Globals.emitter?.Call("upoutside");
		});
		this.on("pointertap", () => {
			if (this.state === "disabled") return;
			options.onClick?.();
			if (!this.callbacksOnly) Globals.emitter?.Call("click");
		});

		this.updateVisualsForState(true);
	}

	public setEnabled(enabled: boolean): void {
		this.state = enabled ? "normal" : "disabled";
		this.eventMode = enabled ? "static" : "none";
		this.cursor = enabled ? "pointer" : "auto";
		this.updateVisualsForState();
	}

	public setLabel(text: string, style?: TextStyle): void {
		if (!this.titleLabel) {
			this.titleLabel = new TextLabel(0, 0, 0.5, text, 20, 0xffffff, "Arial");
			if (style) this.titleLabel.style = style;
			this.addChild(this.titleLabel);
		} else {
			this.titleLabel.updateLabelText(text);
			if (style) this.titleLabel.style = style;
		}
	}

	public setTextures(textures: Partial<ButtonTextures>): void {
		this.textures = { ...this.textures, ...textures };
		this.updateVisualsForState(true);
	}

	public setAnimations(animations: Partial<ButtonAnimationConfig>): void {
		this.anim = { ...this.anim, ...animations };
		this.updateVisualsForState(true);
	}

	private setState(next: ButtonState): void {
		if (this.state === next) return;
		this.state = next;
		this.updateVisualsForState();
	}

	private updateVisualsForState(immediate = false): void {
		switch (this.state) {
			case "disabled":
				if (this.textures.disabled) this.sprite.texture = this.textures.disabled;
				else this.sprite.texture = this.textures.normal;
				this.playScaleTween(this.baseScale, immediate);
				this.alpha = this.anim.disabledAlpha;
				break;
			case "down":
				if (this.textures.down) this.sprite.texture = this.textures.down;
				else this.sprite.texture = this.textures.normal;
				this.alpha = 1;
				this.playScaleTween(this.anim.downScale, immediate);
				break;
			case "hover":
				if (this.textures.hover) this.sprite.texture = this.textures.hover;
				else this.sprite.texture = this.textures.normal;
				this.alpha = 1;
				this.playScaleTween(this.anim.hoverScale, immediate);
				break;
			case "normal":
			default:
				this.sprite.texture = this.textures.normal;
				this.alpha = 1;
				this.playScaleTween(this.baseScale, immediate);
				break;
		}
	}

	private playScaleTween(targetScale: number, immediate: boolean): void {
		if (this.currentTween) {
			this.currentTween.stop();
			this.currentTween = undefined;
		}
		if (immediate) {
			this.scale.set(targetScale);
			return;
		}
		this.currentTween = new Tween(this.scale)
			.to({ x: targetScale, y: targetScale }, this.anim.durationMs)
			.easing(Easing.Cubic.Out)
			.start();
		Group.shared.update();
	}
}

// Graphic button variant using PIXI.Graphics (rounded rect) with the same interaction model
export interface GraphicButtonStyle {
	width: number;
	height: number;
	radius?: number;
	fillNormal: number;
	fillHover?: number;
	fillDown?: number;
	fillDisabled?: number;
	stroke?: number;
	strokeWidth?: number;
}

export interface GraphicButtonOptions {
	style: GraphicButtonStyle;
	labelText?: string;
	labelStyle?: TextStyle;
	anchor?: number;
	animations?: ButtonAnimationConfig;
	/** If true, only callbacks are invoked; no global emits are fired */
	callbacksOnly?: boolean;
	onClick?: () => void;
	onDown?: () => void;
	onUp?: () => void;
	onOver?: () => void;
	onOut?: () => void;
}

export class UIGraphicButton extends Container {
	private bg: Graphics;
	private titleLabel?: TextLabel;
	private state: ButtonState = "normal";
	private style: GraphicButtonStyle;
	private anim: Required<ButtonAnimationConfig>;
	private currentTween?: Tween<any>;
	private baseScale = 1;
	private callbacksOnly: boolean;

	constructor(options: GraphicButtonOptions) {
		super();
		this.style = options.style;
		this.anim = { ...DefaultAnim, ...(options.animations ?? {}) };
		this.callbacksOnly = !!options.callbacksOnly;

		this.bg = new Graphics();
		this.addChild(this.bg);

		const anchor = options.anchor ?? 0.5;
		this.pivot.set(this.style.width * anchor, this.style.height * anchor);

		if (options.labelText) {
			this.titleLabel = new TextLabel(this.style.width / 2, this.style.height / 2, 0.5, options.labelText, 20, 0xffffff, "Arial");
			if (options.labelStyle) this.titleLabel.style = options.labelStyle;
			this.addChild(this.titleLabel);
		}

		this.eventMode = "static";
		this.cursor = "pointer";

		this.on("pointerover", () => {
			if (this.state === "disabled") return;
			this.setState("hover");
			options.onOver?.();
			if (!this.callbacksOnly) Globals.emitter?.Call("over");
		});
		this.on("pointerout", () => {
			if (this.state === "disabled") return;
			this.setState("normal");
			options.onOut?.();
			if (!this.callbacksOnly) Globals.emitter?.Call("out");
		});
		this.on("pointerdown", () => {
			if (this.state === "disabled") return;
			this.setState("down");
			options.onDown?.();
			if (!this.callbacksOnly) Globals.emitter?.Call("down");
		});
		this.on("pointerup", () => {
			if (this.state === "disabled") return;
			this.setState("hover");
			options.onUp?.();
			if (!this.callbacksOnly) Globals.emitter?.Call("up");
		});
		this.on("pointerupoutside", () => {
			if (this.state === "disabled") return;
			this.setState("normal");
			options.onUp?.();
			if (!this.callbacksOnly) Globals.emitter?.Call("upoutside");
		});
		this.on("pointertap", () => {
			if (this.state === "disabled") return;
			options.onClick?.();
			if (!this.callbacksOnly) Globals.emitter?.Call("click");
		});

		this.redraw();
		this.updateVisualsForState(true);
	}

	public setEnabled(enabled: boolean): void {
		this.state = enabled ? "normal" : "disabled";
		this.eventMode = enabled ? "static" : "none";
		this.cursor = enabled ? "pointer" : "auto";
		this.updateVisualsForState();
	}

	public setLabel(text: string, style?: TextStyle): void {
		if (!this.titleLabel) {
			this.titleLabel = new TextLabel(this.style.width / 2, this.style.height / 2, 0.5, text, 20, 0xffffff, "Arial");
			if (style) this.titleLabel.style = style;
			this.addChild(this.titleLabel);
		} else {
			this.titleLabel.updateLabelText(text);
			if (style) this.titleLabel.style = style;
		}
	}

	public setStyle(style: Partial<GraphicButtonStyle>) {
		this.style = { ...this.style, ...style };
		this.redraw();
	}

	private redraw() {
		const {
			width, height, radius = 12,
			stroke = 0x000000, strokeWidth = 0
		} = this.style;
		this.bg.clear();
		if (strokeWidth > 0) {
			this.bg.stroke({ color: stroke, width: strokeWidth });
		}
		this.bg.roundRect(0, 0, width, height, radius);
		const color = this.getFillColorForState();
		this.bg.fill(color);
	}

	private getFillColorForState(): number {
		const { fillNormal, fillHover, fillDown, fillDisabled } = this.style;
		switch (this.state) {
			case "hover": return fillHover ?? fillNormal;
			case "down": return fillDown ?? fillHover ?? fillNormal;
			case "disabled": return fillDisabled ?? fillNormal;
			default: return fillNormal;
		}
	}

	private setState(next: ButtonState): void {
		if (this.state === next) return;
		this.state = next;
		this.updateVisualsForState();
	}

	private updateVisualsForState(immediate = false): void {
		this.redraw();
		this.alpha = this.state === "disabled" ? this.anim.disabledAlpha : 1;
		const target =
			this.state === "down" ? this.anim.downScale :
			this.state === "hover" ? this.anim.hoverScale : this.baseScale;
		this.playScaleTween(target, immediate);
	}

	private playScaleTween(targetScale: number, immediate: boolean): void {
		if (this.currentTween) {
			this.currentTween.stop();
			this.currentTween = undefined;
		}
		if (immediate) {
			this.scale.set(targetScale);
			return;
		}
		this.currentTween = new Tween(this.scale)
			.to({ x: targetScale, y: targetScale }, this.anim.durationMs)
			.easing(Easing.Cubic.Out)
			.start();
		Group.shared.update();
	}
}


