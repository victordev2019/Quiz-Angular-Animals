import {Component, OnInit} from '@angular/core';
import {AnimalService} from '../../shared/service/animal.service';
import {MatDialog} from '@angular/material';
import {SnackBarService} from '../../shared/service/snack-bar.service';
import {StartQuizComponent} from '../start-quiz/start-quiz.component';
import {ConditionComponent} from '../condition/condition.component';
import {FinishQuizComponent} from '../finish-quiz/finish-quiz.component';
import {CongratsComponent} from '../congrats/congrats.component';
import {AddAnimalComponent} from '../add-animal/add-animal.component';
import {AddConditionComponent} from '../add-condition/add-condition.component';
import {CongratsHelpComponent} from '../congrats-help/congrats-help.component';

export interface Animal {
  id: number;
  name: string;
  conditions: Array<Condition>;
}

export interface Condition {
  id: number;
  condition: string;
}

@Component({
  selector: 'app-questions',
  templateUrl: './questions.component.html',
  styleUrls: ['./questions.component.css']
})
export class QuestionsComponent implements OnInit {

  animals: Array<Animal> = new Array<Animal>();

  conditionsUsed: Array<Condition> = new Array<Condition>();

  lastAnimal: Animal;

  lastCondition: Condition;

  newAnimal: Animal;

  constructor(private animalService: AnimalService,
              private snackBar: SnackBarService,
              public dialog: MatDialog) {
  }

  ngOnInit() {
  }

  /**
   * Metodo para iniciar o quiz
   */
  startQuiz() {
    this.animalService.getAnimals()
      .subscribe(res => this.animals = res.data,
        error => this.openSnackBar(error),
        () => this.animals.length > 0
          ? this.startQuizDialog()
          : this.openSnackBar('Nenhum animal cadastrado'));
  }

  /**
   * Metodo para mostrar mensagem de erro na tela
   * @param msg Mensagem para ser exibido
   */
  openSnackBar(msg: string) {
    this.snackBar.openSnackBarWithMessage(msg);
  }

  /**
   * Metodo para iniciar o dialogo do quiz
   */
  startQuizDialog(): void {
    const dialogRef = this.dialog.open(StartQuizComponent, {
      width: '400px'
    });

    dialogRef.afterClosed().subscribe(res => {
      res ? this.initTheQuiz() : console.log('não quer jogar');
    });
  }

  /**
   *Iniciar o Quiz selecionando o primeiro animal e sua primeira condicao
   */
  initTheQuiz() {
    const firstCondition = this.animals[0];
    this.openCondition(firstCondition.conditions[0]);
  }

  /**
   * Exibe o dialogo com a condicao passada no parametro
   * @param condition Condicao do animal
   */
  openCondition(condition: Condition) {
    const dialogRef = this.dialog.open(ConditionComponent, {
      width: '400px',
      data: condition
    });

    dialogRef.afterClosed().subscribe(res => {
      res ? this.removeAnimalWithoutCondition(condition) : this.removeAnimalWithCondition(condition);
    });
  }

  /**
   * Metodo para finalizar o quiz
   * @param animal Animal que tentamos adivinhar
   */
  finishQuiz(animal: Animal) {
    this.lastAnimal = animal;
    const dialogRef = this.dialog.open(FinishQuizComponent, {
      width: '400px',
      data: animal
    });

    dialogRef.afterClosed().subscribe(res => {
      res ? this.congrats() : this.addAnimal();
    });
  }

  /**
   * Abrir dialogo de parabenizacao de acerto
   */
  congrats() {
    this.conditionsUsed = new Array<Condition>();
    this.dialog.open(CongratsComponent, {
      width: '400px'
    });
  }

  /**
   * Abrir dialogo para parabenizacao por ajudar na "inteligencia" do quiz
   */
  congratsHelp() {
    this.dialog.open(CongratsHelpComponent, {
      width: '400px'
    });
  }

  /**
   * Abre dialogo para adicionar um animal no Quiz
   */
  addAnimal() {
    const dialogRef = this.dialog.open(AddAnimalComponent, {
      width: '400px',
    });
    dialogRef.afterClosed().subscribe(res => {
      res.help ? this.addCondition(res.name) : this.conditionsUsed = new Array<Condition>();
    });
  }

  /**
   * Abre dialogo para dicionar uma nova condicao ao novo animal do quiz
   * @param animalName Animal Restante que não acertamos
   */
  addCondition(animalName: string) {
    this.newAnimal = {
      name: animalName,
      id: null,
      conditions: this.conditionsUsed
    };

    const dialogRef = this.dialog.open(AddConditionComponent, {
      width: '400px',
      data: {
        animalName: this.lastAnimal.name,
        conditionName: this.lastCondition.condition,
        newAnimal: this.newAnimal.name
      }
    });

    dialogRef.afterClosed().subscribe(res => {
      res.help ? this.saveNewAnimal(res.name) : this.conditionsUsed = new Array<Condition>();
    });
  }

  /**
   * Salva a condicao e o animal na nossa API
   * @param condition Nova condicao
   */
  saveNewAnimal(condition: string) {
    this.animalService.saveCondition(condition)
      .subscribe(res => {
          this.newAnimal.conditions.push(res.data);
        },
        error => this.snackBar.openSnackBarWithMessage(error),
        () => {
          this.animalService.saveAnimal(this.newAnimal)
            .subscribe(() => console.log('Finished'),
              error => this.snackBar.openSnackBarWithMessage(error.message),
              () => this.congratsHelp());
        });

  }

  /**
   * Remove da lista animais com a condicao passada no parametro
   * @param condition Condicao
   */
  removeAnimalWithCondition(condition: Condition) {
    this.animals = this.animals.filter(animal => !this.haveConditionINArray(animal.conditions, condition));

    this.removeConditionOfAll(condition);

    if (this.animals.length === 1) {
      this.finishQuiz(this.animals[0]);
    } else if (this.animals.length === 0) {
      this.addAnimal();
    } else {
      this.nextCondition();
    }
  }

  /**
   * Remove animais que não possuem a condicao passada no parametro
   * @param condition Condicao
   */
  removeAnimalWithoutCondition(condition: Condition) {
    this.conditionsUsed.push(condition);
    this.lastCondition = condition;

    this.animals = this.animals.filter(animal => this.haveConditionINArray(animal.conditions, condition));

    this.removeConditionOfAll(condition);

    if (this.animals.length === 1) {
      this.finishQuiz(this.animals[0]);
    } else if (this.animals.length === 0) {
      this.addAnimal();
    } else {
      this.nextCondition();
    }
  }

  /**
   * Remove a condicao de todos os animais restantes
   * @param condition Condicao
   */
  removeConditionOfAll(condition: Condition) {
    this.animals.forEach(animal => animal.conditions = animal.conditions.filter(element => element.id !== condition.id));
  }

  /**
   * Verifica qual o proximo animal que possuem uma nova condicao para ser usada no quiz
   */
  nextCondition() {
    let index = 0;
    for (index; index < this.animals.length; index++) {
      if (this.haveCondition(index)) {
        break;
      }
    }
    this.openCondition(this.animals[index].conditions[0]);
  }

  /**
   * Verifica se possue condicoes
   * @param index
   */
  haveCondition(index: number): boolean {
    return this.animals[index].conditions.length > 0;
  }

  /**
   * Verifica se a lista possue a condicao passada no aprametro
   * @param conditions Lista de condicoes do animal
   * @param condition Condicao para verificar
   */
  haveConditionINArray(conditions: Array<Condition>, condition: Condition): boolean {
    return conditions.filter(element => element.id === condition.id).length > 0;
  }
}
