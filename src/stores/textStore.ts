import { observable, action, reaction } from "mobx";
import { ObjectManagerStore } from "./objectManagerStore";
import { RootStore } from "./rootStore";

import { fabric } from "fabric";
import { ModeName } from "./canvasStore";
import { Reactions } from "./drawingStore";

interface ITextObject extends fabric.IText {
  fontColorCode: string;
  bgColorCode: string;
  isBgTransparent: boolean;
  defaultFontSize: number;
}

interface ITextStyle {
  fontWeight: FontWeight;
  underline: boolean | undefined;
  fontStyle: FontStyle;
  textAlign: string | undefined;
  fontFamily: string;
  fontSize: number;
  lineHeight: number;
  fontColorCode: string;
  isBgTransparent: boolean;
  bgColorCode: string;
} {
}

export let TextСonstants = {
  MIN_FONT_SIZE: 10,
  MAX_FONT_SIZE: 200,
  INIT_FONT_SIZE: 40,
  MIN_LINE_HEIGHT: 1,
  MAX_LINE_HEIGHT: 10,
  INIT_TEXT: "Hello World",
};

const defaultStyles: ITextStyle = {
  fontWeight: "normal",
  underline: false,
  fontStyle: "normal",
  textAlign: "left",
  fontFamily: "Arial",
  fontSize: TextСonstants.INIT_FONT_SIZE,
  lineHeight: TextСonstants.MIN_LINE_HEIGHT,
  fontColorCode: "255, 255, 255",
  isBgTransparent: true,
  bgColorCode: "255, 255, 255",
};

type FontStyle = "" | "normal" | "italic" | "oblique" | undefined;
type FontWeight = string | number | undefined;
type FontFamily = string | "Arial" | "Roboto";

export class TextStore {

  @observable fontWeight: FontWeight = defaultStyles.fontWeight;
  @observable underline: boolean | undefined = defaultStyles.underline;
  @observable fontStyle: FontStyle = defaultStyles.fontStyle;
  @observable textAlign: string | undefined = defaultStyles.textAlign;
  @observable fontFamily: string = defaultStyles.fontFamily;
  @observable fontSize: number = defaultStyles.fontSize;
  @observable lineHeight: number = defaultStyles.lineHeight;
  @observable fontColorCode: string = defaultStyles.fontColorCode;
  @observable isBgTransparent: boolean = defaultStyles.isBgTransparent;
  @observable bgColorCode: string = defaultStyles.bgColorCode;

  private readonly canvas: fabric.Canvas;
  private readonly objectManager: ObjectManagerStore;
  private text: ITextObject;
  private readonly listeners: any;
  readonly OBJ_NAME: ModeName = "text";
  private reactions: Reactions = null;
  constructor(private readonly root: RootStore) {
    this.canvas = root.canvasStore.instance;
    this.objectManager = root.objectManagerStore;
    this.text = new fabric.IText("") as ITextObject;
    this.listeners = {
      onObjectScaling: this.onTextScaling.bind(this),
    };
    this.objectManager.registerObject(this.OBJ_NAME);
    root.canvasStore.registerSessionManager(this.OBJ_NAME, this);

    reaction(
      () => this.text,
      text => {
        this.updateTextStyles(text);
      }
    );
  }

  @action

  private resetStyle(): void {
    this.setTextStyle(defaultStyles);
    this.setFontSize(defaultStyles.fontSize);
  } setText(t: any): any {
    TextСonstants.INIT_TEXT = t;
  }

  @action

  toggleFontWeight(): void {
    if (this.fontWeight === "normal") {
      this.setFontWeight("bold");
      return;
    }
    this.setFontWeight("normal");
  }

  @action

  toggleTextDecoration(): void {
    this.setTextDecoration(!this.underline);
  }

  @action

  toggleFontStyle(): void {
    if (this.fontStyle === "normal") {
      this.setFontStyle("italic");
      return;
    }
    this.setFontStyle("normal");
  }

  @action

  private setTextStyle(style: ITextStyle): void {
    this.setFontWeight(style.fontWeight);
    this.setFontFamily(style.fontFamily);
    this.setTextDecoration(style.underline);
    this.setFontStyle(style.fontStyle);
    this.setTextAlign(style.textAlign);
    this.updateFontSize(style.fontSize);
    this.setLineHeight(style.lineHeight);
    this.setFontColor(style.fontColorCode);
    this.setBackgroundColor(style.bgColorCode);
    this.setBackgroundTransparency(style.isBgTransparent);
  }

  @action private setFontWeight(fontWeight: FontWeight): void {
    this.fontWeight = fontWeight;
    this.text.set({fontWeight});
    this.canvas.renderAll();
  }

  @action
  private updateTextStyles(text: ITextObject) {
    this.fontWeight = text.fontWeight;
    this.underline = text.underline;
    this.fontStyle = text.fontStyle;
    this.textAlign = text.textAlign;
    this.fontFamily = text.fontFamily as string;
    this.fontSize = text.fontSize;
    this.lineHeight = text.lineHeight;
    this.fontColorCode = text.fontColorCode;
    this.isBgTransparent = text.isBgTransparent;
    this.bgColorCode = text.bgColorCode;
  }

  @action setFontFamily(fontFamily: string): void {
    this.fontFamily = fontFamily;
    this.text.set({fontFamily});
    this.canvas.renderAll();
  }

  @action private setTextDecoration(underline: boolean | undefined): void {
    this.underline = underline;
    this.text.set({underline});
    this.canvas.renderAll();
  }

  @action

  toggleBackground(): void {
    this.setBackgroundTransparency(!this.isBgTransparent);
  }

  @action private setFontStyle(fontStyle: FontStyle): void {
    this.fontStyle = fontStyle;
    this.text.set({fontStyle});
    this.canvas.renderAll();
  } setTextAlign(textAlign: string | undefined): void {
    if (textAlign !== undefined) {
      this.textAlign = textAlign;
      this.text.set({textAlign});
      this.canvas.renderAll();
    }
  } private updateFontSize(value: number): void {
    this.fontSize = value;
  }

  @action setLineHeight(lineHeight: number | undefined): void {
    if (lineHeight) {
      this.lineHeight = lineHeight;
      this.text.set({lineHeight: 1 + lineHeight / 10});
      this.canvas.renderAll();
    }
  } addText(textP: any, x: any, y: any, fontSize: any): any {
    if(textP) TextСonstants.INIT_TEXT = textP;
    else TextСonstants.INIT_TEXT = "Hello World";
    if(fontSize) defaultStyles.fontSize = fontSize;
    this.createText();
    this.canvas.add(this.text)
    this.canvas.setActiveObject(this.text)
    
    if(x || y)
      this.text.setPositionByOrigin(new fabric.Point(x, y), "left", "top");
    else 
      this.text.center().setCoords();

    this.objectManager.selectObject(this.text);
  } setFontColor(rgbCode: string): void {
    this.fontColorCode = rgbCode;
    this.text.fontColorCode = rgbCode;
    this.text.set({fill: `rgb(${rgbCode})`});
    this.canvas.renderAll();
  }

  @action setBackgroundColor(rgbCode: string): void {
    this.bgColorCode = rgbCode;
    this.text.bgColorCode = rgbCode;
  } private setBackgroundTransparency(value: boolean): void {
    this.isBgTransparent = value;
    this.text.isBgTransparent = value;
  }

  onSessionStart(): void {
    this.addReactions();
    this.addEventListeners();
    this.canvas.discardActiveObject().renderAll();
    this.objectManager.deselectObject();
    this.objectManager.lockObjects([this.OBJ_NAME]);
  }

  onSessionEnd(): void {
    this.disposeReactions();
    this.removeEventListeners();
    this.canvas.discardActiveObject().renderAll();
    this.objectManager.deselectObject();
    this.objectManager.unlockObjects();
  }

  private addEventListeners(): void {
    this.canvas.on("object:scaling", this.listeners.onObjectScaling);
  }

  private removeEventListeners(): void {
    this.canvas.off("object:scaling", this.listeners.onObjectScaling);
  }

  private addReactions(): void {
    this.reactions = {
      onSelect: reaction(
        () => this.objectManager.selectedObject,
        selectedObject => {
          if (selectedObject) {
            this.text = selectedObject as ITextObject;
            this.updateTextStyle();
          }
        },
      ),

      onBackgroundColorChange: reaction(
        () => [this.bgColorCode, this.isBgTransparent],
        bgColor => {
          this.text.set({textBackgroundColor:
            `rgba(${bgColor[0]}, ${Number(!bgColor[1])})`,
          });
          this.canvas.renderAll();
        },
      ),
    };
  }

  private disposeReactions(): void {
    for (let reactionName in this.reactions) {
      this.reactions[reactionName]();
    }
    this.reactions = null;
  }

  private updateTextStyle(): void {
    let {
      fontWeight,
      fontFamily,
      underline,
      fontStyle,
      textAlign,
      scaleX,
      defaultFontSize,
      lineHeight,
      fontColorCode,
      bgColorCode,
      isBgTransparent,
    } = this.text;

    this.setTextStyle({
      fontWeight,
      fontFamily,
      underline,
      fontStyle,
      textAlign,
      lineHeight: lineHeight ? Math.round((lineHeight - 1) * 10) : 1,
      fontSize: defaultFontSize * (scaleX || 1),
      fontColorCode,
      bgColorCode,
      isBgTransparent,
    });
  } setFontSize(fontSize: number | undefined): void {
    if (fontSize) {
      this.text.scaleX = 1;
      this.text.scaleY = 1;
      this.text.defaultFontSize = fontSize;
      this.text.set({fontSize});
      this.canvas.renderAll();
      this.updateFontSize(fontSize);
    }
  }

  private createText(): void {
    this.text = new fabric.IText(TextСonstants.INIT_TEXT) as ITextObject;
    this.text.name = this.OBJ_NAME;
    this.resetStyle();
  }

  private onTextScaling(event: fabric.IEvent): void {
    const target = event.target as ITextObject;
    if (!target) {
      return;
    }
    target.lockScalingFlip = true;
    const corner = event?.transform?.corner ?? "";
    if (corner === "mb" || corner === "mt") {
      target.scaleX = target.scaleY;
    } else if (corner === "mr" || corner === "ml") {
      target.scaleY = target.scaleX;
    }
    const {scaleX = 1, defaultFontSize} = target;
    target.minScaleLimit = TextСonstants.MIN_FONT_SIZE / defaultFontSize;
    this.updateFontSize(defaultFontSize * scaleX);
  }
}
